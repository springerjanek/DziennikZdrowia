package pl.dziennikzdrowia.medication.catalog;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

/**
 * Wyszukiwarka leków: najpierw aktualny wykaz MZ z bazy, a gdy wyników jest mało,
 * dopytuje słownik NFZ o leki, których w wykazie nie ma (pacjent płaci pełną cenę).
 */
@Service
public class MedicationSearchService {

    public static final int MIN_QUERY_LENGTH = 2;

    private final CatalogMedicationRepository repository;
    private final NfzDictionaryClient nfzDictionaryClient;

    public MedicationSearchService(CatalogMedicationRepository repository,
                                   NfzDictionaryClient nfzDictionaryClient) {
        this.repository = repository;
        this.nfzDictionaryClient = nfzDictionaryClient;
    }

    // Bez @Transactional: nie trzymamy połączenia z bazą, czekając na API NFZ.
    public List<MedicationSearchResult> search(String query, int limit) {
        String needle = query.strip();
        if (needle.length() < MIN_QUERY_LENGTH) {
            return List.of();
        }

        String pattern = likePattern(needle);
        List<String> gtins = repository.searchGtins(pattern, PageRequest.of(0, limit));
        List<MedicationSearchResult> results = new ArrayList<>(describe(gtins));

        if (results.size() < limit) {
            results.addAll(notReimbursed(needle, pattern, limit - results.size()));
        }
        return results;
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
                    row.getIndication(), row.getLevel().apiValue(), row.getPatientSurcharge()));
        }

        return new MedicationSearchResult(
                first.getGtin(),
                first.getName(),
                first.getActiveSubstance(),
                first.getPackSize(),
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
                results.add(new MedicationSearchResult(null, name, null, null, fullPrice));
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
        String escaped = needle.toLowerCase()
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return "%" + escaped + "%";
    }
}
