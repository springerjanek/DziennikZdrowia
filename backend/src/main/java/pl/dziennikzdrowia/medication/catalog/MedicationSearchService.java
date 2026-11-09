package pl.dziennikzdrowia.medication.catalog;

import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.*;

/**
 * Wyszukiwarka leków: najpierw aktualny wykaz MZ z bazy, a gdy wyników jest mało,
 * dopytuje słownik NFZ o leki, których w wykazie nie ma (pacjent płaci pełną cenę).
 *
 * <p>Substancje w wykazie są po łacinie ("Levothyroxinum"), a użytkownicy piszą po polsku
 * ("lewotyroksyna"). Dlatego oprócz zwykłego dopasowania porównujemy też wspólną pisownię:
 * zapytanie i kolumny w bazie przechodzą przez te same zamiany ({@link #SPELLING}), więc
 * obie formy sprowadzają się do "levotirocsin...". Nazwy, których nie da się tak dopasować
 * ("kwas foliowy" = "Acidum folicum"), obsługuje mała tabela aliasów ({@link #ALIASES}).
 */
@Service
public class MedicationSearchService {

    public static final int MIN_QUERY_LENGTH = 2;

    /**
     * Zamiany sprowadzające polską i łacińską pisownię do wspólnej postaci. Kolejność ma znaczenie
     * i jest ta sama w Javie ({@link #spelling}) i w SQL ({@link #spellingSql}).
     * Polskie k/ks/kw/w/y/z odpowiadają łacińskim c/x/qu/v/y/s, a polski zapis nie ma "th", "ph"
     * ani podwójnych liter ("amoksycylina" / "Amoxicillinum").
     */
    static final List<Map.Entry<String, String>> SPELLING = List.of(
            Map.entry("th", "t"), Map.entry("ph", "f"), Map.entry("qu", "cv"), Map.entry("x", "cs"),
            Map.entry("w", "v"), Map.entry("y", "i"), Map.entry("k", "c"), Map.entry("z", "s"),
            Map.entry("ll", "l"), Map.entry("ss", "s"), Map.entry("mm", "m"), Map.entry("nn", "n"),
            Map.entry("tt", "t"), Map.entry("ff", "f"), Map.entry("pp", "p"));

    /**
     * Polska nazwa (małymi literami, bez ogonków) -> łacińska nazwa z wykazu.
     * Tylko to, czego nie załatwi {@link #SPELLING}.
     */
    static final Map<String, String> ALIASES = Map.ofEntries(
            Map.entry("kwas acetylosalicylowy", "acidum acetylsalicylicum"),
            Map.entry("kwas foliowy", "acidum folicum"),
            Map.entry("kwas walproinowy", "acidum valproicum"),
            Map.entry("kwas alendronowy", "acidum alendronicum"),
            Map.entry("kwas zoledronowy", "acidum zoledronicum"),
            Map.entry("kwas ursodeoksycholowy", "acidum ursodeoxycholicum"),
            Map.entry("kwas traneksamowy", "acidum tranexamicum"),
            Map.entry("witamina d3", "cholecalciferolum"),
            Map.entry("witamina b12", "cyanocobalaminum"),
            Map.entry("witamina k", "phytomenadionum"),
            Map.entry("adrenalina", "epinephrinum"),
            Map.entry("noradrenalina", "norepinephrinum"),
            Map.entry("zelazo", "ferrum"),
            Map.entry("potas", "kalium"),
            Map.entry("magnez", "magnesium"),
            Map.entry("wapn", "calcium"));

    private static final int MAX_ALIASES = 3;

    // Oceny dopasowania (mniej = lepiej), te same co w RANKED_GTINS.
    static final int NAME_PREFIX = 0;
    static final int SUBSTANCE_PREFIX = 1;
    static final int WORD_PREFIX = 2;
    static final int INSIDE_WORD = 3;

    // Jakość dopasowania:
    // 0 = nazwa zaczyna się od zapytania ("met" -> Metfogamma),
    // 1 = substancja zaczyna się od zapytania (czysty lek: "paracetamol" -> Apap),
    // 2 = któreś słowo nazwy lub substancji zaczyna się od zapytania (lek złożony: Doreta = "Tramadolum + Paracetamolum"),
    // 3 = zapytanie w środku słowa ("met" w "Salmeterolum").
    private static final String RANKED_GTINS = """
            select m.gtin, m.name, min(case
                    when lower(m.name) like :prefix escape '\\' or %1$s like :spellingPrefix escape '\\' then 0
                    when lower(m.activeSubstance) like :prefix escape '\\' or %2$s like :spellingPrefix escape '\\' then 1
                    when lower(m.name) like :wordPrefix escape '\\' or %1$s like :spellingWordPrefix escape '\\'
                      or lower(m.activeSubstance) like :wordPrefix escape '\\' or %2$s like :spellingWordPrefix escape '\\' then 2
                    else 3 end) as quality
            from CatalogMedication m
            where lower(m.name) like :pattern escape '\\'
               or lower(m.activeSubstance) like :pattern escape '\\'
               or %1$s like :spellingPattern escape '\\'
               or %2$s like :spellingPattern escape '\\'
            group by m.gtin, m.name
            order by quality, m.name""".formatted(spellingSql("m.name"), spellingSql("m.activeSubstance"));

    private final CatalogMedicationRepository repository;
    private final NfzDictionaryClient nfzDictionaryClient;
    private final EntityManager entityManager;

    public MedicationSearchService(CatalogMedicationRepository repository,
                                   NfzDictionaryClient nfzDictionaryClient,
                                   EntityManager entityManager) {
        this.repository = repository;
        this.nfzDictionaryClient = nfzDictionaryClient;
        this.entityManager = entityManager;
    }

    // Bez @Transactional: nie trzymamy połączenia z bazą, czekając na API NFZ.
    public List<MedicationSearchResult> search(String query, int limit) {
        String needle = query.strip();
        if (needle.length() < MIN_QUERY_LENGTH) {
            return List.of();
        }

        List<Ranked> ranked = rankedGtins(needle, limit);
        Map<String, Integer> quality = new HashMap<>();
        ranked.forEach(r -> quality.put(r.gtin(), r.quality()));

        List<Scored> results = new ArrayList<>();
        for (MedicationSearchResult medication : describe(ranked.stream().map(Ranked::gtin).toList())) {
            results.add(new Scored(medication, quality.get(medication.ean())));
        }

        // Słownik NFZ dopytujemy, gdy wykazu brakuje do limitu, ale też gdy w wykazie nic nie zaczyna się
        // od zapytania: "paracetamol" daje w wykazie tylko połączenia z tramadolem, a czysty paracetamol
        // (Paracetamol Kabi) jest tylko w NFZ i musi wyprzedzić te połączenia.
        boolean strongCatalogMatch = ranked.stream().anyMatch(r -> r.quality() <= SUBSTANCE_PREFIX);
        if (results.size() < limit || !strongCatalogMatch) {
            for (MedicationSearchResult medication : notReimbursed(needle, likePattern(needle), limit)) {
                results.add(new Scored(medication, nameQuality(medication.name(), needle)));
            }
        }

        // Sortowanie stabilne: przy tej samej ocenie wykaz zostaje przed NFZ, a kolejność w grupie się nie zmienia.
        return results.stream()
                .sorted(Comparator.comparingInt(Scored::quality))
                .limit(limit)
                .map(Scored::result)
                .toList();
    }

    private record Scored(MedicationSearchResult result, int quality) {
    }

    /** Ocena jak w {@link #RANKED_GTINS}, ale dla samej nazwy (NFZ nie podaje substancji). */
    static int nameQuality(String name, String needle) {
        String plain = name.toLowerCase();
        String plainNeedle = needle.toLowerCase();
        String spelled = spelling(name);
        String stem = polishStem(spelling(needle));
        if (plain.startsWith(plainNeedle) || spelled.startsWith(stem)) {
            return NAME_PREFIX;
        }
        if (plain.contains(" " + plainNeedle) || spelled.contains(" " + stem)) {
            return WORD_PREFIX;
        }
        return INSIDE_WORD;
    }

    /** Aktualna refundacja dla podanych GTIN-ów. Brak klucza = leku nie ma w wykazie. */
    @Transactional(readOnly = true)
    public Map<String, ReimbursementInfo> reimbursements(Collection<String> gtins) {
        Map<String, ReimbursementInfo> result = new HashMap<>();
        for (MedicationSearchResult medication : describe(gtins)) {
            result.put(medication.ean(), medication.reimbursement());
        }
        return result;
    }

    /** Refundacja dla leku spoza wykazu albo dodanego ręcznie: pełna cena. */
    @Transactional(readOnly = true)
    public ReimbursementInfo fullPrice() {
        return new ReimbursementInfo(
                ReimbursementLevel.FULL.apiValue(), List.of(), currentAnnouncementDate(), List.of());
    }

    /**
     * GTIN-y pasujące do zapytania albo do któregoś z jego aliasów, od najlepiej dopasowanych
     * (zob. {@link #RANKED_GTINS}).
     * Każdy wariant pobiera swoje najlepsze {@code limit} wyników; po złączeniu GTIN dostaje
     * najlepszą ze swoich ocen, więc wspólne top {@code limit} jest poprawne.
     */
    private List<Ranked> rankedGtins(String needle, int limit) {
        Map<String, Ranked> best = new HashMap<>();
        for (String term : searchTerms(needle)) {
            for (Ranked ranked : rankedGtinsFor(term, limit)) {
                best.merge(ranked.gtin(), ranked, (a, b) -> a.compareTo(b) <= 0 ? a : b);
            }
        }
        return best.values().stream()
                .sorted()
                .limit(limit)
                .toList();
    }

    private List<Ranked> rankedGtinsFor(String term, int limit) {
        String plain = escapeLike(term.toLowerCase());
        String spelling = escapeLike(polishStem(spelling(term)));
        List<Object[]> rows = entityManager.createQuery(RANKED_GTINS, Object[].class)
                .setParameter("pattern", "%" + plain + "%")
                .setParameter("prefix", plain + "%")
                .setParameter("wordPrefix", "% " + plain + "%")
                .setParameter("spellingPattern", "%" + spelling + "%")
                .setParameter("spellingPrefix", spelling + "%")
                .setParameter("spellingWordPrefix", "% " + spelling + "%")
                .setMaxResults(limit)
                .getResultList();
        return rows.stream()
                .map(row -> new Ranked((String) row[0], (String) row[1], ((Number) row[2]).intValue()))
                .toList();
    }

    /** Zapytanie i łacińskie odpowiedniki z {@link #ALIASES} ("kwas fol" -> "acidum folicum"). */
    static List<String> searchTerms(String needle) {
        String polish = stripDiacritics(needle.toLowerCase()).replaceAll("\\s+", " ");
        List<String> terms = new ArrayList<>();
        terms.add(needle);
        ALIASES.entrySet().stream()
                .filter(alias -> polish.startsWith(alias.getKey())
                        || (polish.length() >= 3 && alias.getKey().startsWith(polish)))
                .map(Map.Entry::getValue)
                .sorted()
                .limit(MAX_ALIASES)
                .forEach(terms::add);
        return terms;
    }

    private record Ranked(String gtin, String name, int quality) implements Comparable<Ranked> {
        @Override
        public int compareTo(Ranked other) {
            int byQuality = Integer.compare(quality, other.quality);
            return byQuality != 0 ? byQuality : name.compareTo(other.name);
        }
    }

    private List<MedicationSearchResult> describe(Collection<String> gtins) {
        if (gtins.isEmpty()) {
            return List.of();
        }

        Map<String, List<CatalogMedication>> rowsByGtin = new LinkedHashMap<>();
        for (String gtin : gtins) {
            rowsByGtin.put(gtin, new ArrayList<>());
        }
        for (CatalogMedication row : repository.findByGtinIn(gtins)) {
            rowsByGtin.get(row.getGtin()).add(row);
        }

        Map<String, List<String>> freeFor = new HashMap<>();
        for (CatalogEntitlement entitlement : repository.findEntitlements(gtins)) {
            freeFor.computeIfAbsent(entitlement.getGtin(), key -> new ArrayList<>())
                    .add(entitlement.getCode().name());
        }

        List<MedicationSearchResult> results = new ArrayList<>();
        rowsByGtin.forEach((gtin, rows) -> {
            if (!rows.isEmpty()) {
                results.add(toResult(rows, freeFor.getOrDefault(gtin, List.of())));
            }
        });
        return results;
    }

    private static MedicationSearchResult toResult(List<CatalogMedication> rows, List<String> freeFor) {
        CatalogMedication first = rows.getFirst();
        ReimbursementLevel best = ReimbursementLevel.FULL;
        List<ReimbursementInfo.Indication> indications = new ArrayList<>();
        for (CatalogMedication row : rows) {
            if (row.getLevel().compareTo(best) < 0) {
                best = row.getLevel();
            }
            indications.add(new ReimbursementInfo.Indication(
                    row.getIndication(), row.getLevel().apiValue(), row.getPatientSurcharge(), row.getRetailPrice()));
        }

        return new MedicationSearchResult(
                first.getGtin(),
                first.getName(),
                first.getActiveSubstance(),
                first.getPackSize(),
                first.getAtc(),
                first.getRetailPrice(),
                new ReimbursementInfo(
                        best.apiValue(), freeFor, first.getAnnouncementDate(), indications));
    }

    private List<MedicationSearchResult> notReimbursed(String needle, String pattern, int limit) {
        // Wykaz ma nazwy z postacią i dawką ("Metfogamma 500, tabl. powl., 500 mg"),
        // a NFZ samą nazwę handlową ("Metfogamma 500"), więc porównujemy część przed przecinkiem.
        Set<String> catalogBrands = new HashSet<>();
        for (String name : repository.findNamesLike(pattern)) {
            catalogBrands.add(brand(name));
        }

        ReimbursementInfo fullPrice = fullPrice();
        List<MedicationSearchResult> results = new ArrayList<>();
        for (String name : nfzDictionaryClient.searchProductNames(needle, limit + catalogBrands.size())) {
            if (results.size() == limit) {
                break;
            }
            if (!catalogBrands.contains(brand(name))) {
                results.add(new MedicationSearchResult(null, name, null, null, null, null, fullPrice));
            }
        }
        return results;
    }

    private LocalDate currentAnnouncementDate() {
        return repository.findCurrentAnnouncementDate().orElse(null);
    }

    static String brand(String name) {
        int comma = name.indexOf(',');
        return (comma < 0 ? name : name.substring(0, comma)).strip().toLowerCase();
    }

    static String likePattern(String needle) {
        return "%" + escapeLike(needle.toLowerCase()) + "%";
    }

    private static String escapeLike(String text) {
        return text
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    /** Wspólna pisownia polsko-łacińska: "Lewotyroksyna" -> "levotirocsina", "Levothyroxinum" -> "levotirocsinum". */
    static String spelling(String text) {
        String result = stripDiacritics(text.toLowerCase());
        for (Map.Entry<String, String> change : SPELLING) {
            result = result.replace(change.getKey(), change.getValue());
        }
        return result;
    }

    /** To samo co {@link #spelling} jako wyrażenie JPQL (bez usuwania ogonków; nazwy w wykazie to łacina). */
    static String spellingSql(String column) {
        String sql = "lower(" + column + ")";
        for (Map.Entry<String, String> change : SPELLING) {
            sql = "replace(" + sql + ", '" + change.getKey() + "', '" + change.getValue() + "')";
        }
        return sql;
    }

    /** Ucina polską końcówkę "-a" ("metformina" -> "metformin"), żeby pasowało do łacińskiego "-um"/"-i". */
    static String polishStem(String spelling) {
        return spelling.length() >= 5 && spelling.endsWith("a")
                ? spelling.substring(0, spelling.length() - 1)
                : spelling;
    }

    private static String stripDiacritics(String text) {
        return Normalizer.normalize(text.replace('ł', 'l'), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
    }
}
