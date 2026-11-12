package pl.dziennikzdrowia.medication.catalog;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class MedicationSearchServiceTest {

    private static final LocalDate ANNOUNCEMENT = LocalDate.of(2026, 10, 1);

    @Autowired
    private MedicationSearchService searchService;

    @Autowired
    private CatalogMedicationRepository repository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private NfzDictionaryClient nfzDictionaryClient;

    @BeforeEach
    void setUp() {
        transactionTemplate.executeWithoutResult(status -> {
            repository.deleteAllInBatch();
            repository.deleteAllEntitlements();
        });
        repository.saveAll(List.of(
                row("05909990000001", "Metfogamma 500, tabl. powl., 500 mg", "Metforminum", ReimbursementLevel.FLAT_RATE, "Cukrzyca"),
                row("05909990000002", "Siofor 1000, tabl. powl., 1000 mg", "Metforminum", ReimbursementLevel.P30, "Cukrzyca"),
                row("05909990000003", "Sorbalgon 50%_test, opatrunek", "Alginat", ReimbursementLevel.P30, "Owrzodzenia"),
                row("05909990000003", "Sorbalgon 50%_test, opatrunek", "Alginat", ReimbursementLevel.FREE, "EB"),
                row("05909990000004", "Bimetfo Duo, tabl. powl., 50 mg", "Sitagliptinum", ReimbursementLevel.P30, "Cukrzyca"),
                row("05909990000005", "Euthyrox N 50, tabl., 50 µg", "Levothyroxinum natricum", ReimbursementLevel.P30, "Niedoczynność tarczycy"),
                row("05909990000006", "Metotab, tabl., 10 mg", "Methotrexatum", ReimbursementLevel.FLAT_RATE, "RZS"),
                row("05909990000007", "Duomox, tabl., 1000 mg", "Amoxicillinum", ReimbursementLevel.P50, "Zakażenia"),
                row("05909990000008", "Hydrocortisonum Jelfa, tabl., 20 mg", "Hydrocortisonum", ReimbursementLevel.P30, "Niedoczynność kory nadnerczy"),
                row("05909990000009", "Acidum folicum Richter, tabl., 15 mg", "Acidum folicum", ReimbursementLevel.P30, "Niedokrwistość"),
                row("05909990000010", "Apap, tabl., 500 mg", "Paracetamolum", ReimbursementLevel.P30, "Ból"),
                row("05909990000011", "Doreta, tabl. powl., 37,5 mg + 325 mg", "Tramadoli hydrochloridum + Paracetamolum", ReimbursementLevel.P30, "Ból"),
                row("05909990000012", "Aerox, proszek do inhal., 50 µg", "Salmeterolum", ReimbursementLevel.P30, "Astma"),
                row("05909990000013", "BD Micro-Fine+, igły, 31G x 5 mm", "Igły do penów", ReimbursementLevel.P30, "Cukrzyca"),
                row("05909990000014", "Shingrix, proszek i zawiesina", "Szczepionka przeciw półpaścowi", ReimbursementLevel.P50, "Półpasiec")));
        when(nfzDictionaryClient.searchProductNames(anyString(), anyInt())).thenReturn(List.of());
    }

    @Test
    void findsByNameAndSubstanceIgnoringCase() {
        assertThat(searchService.search("METFORMINUM", 10))
                .extracting(MedicationSearchResult::name)
                .containsExactly("Metfogamma 500, tabl. powl., 500 mg", "Siofor 1000, tabl. powl., 1000 mg");

        assertThat(searchService.search("siofor", 10))
                .singleElement()
                .satisfies(result -> {
                    assertThat(result.ean()).isEqualTo("05909990000002");
                    assertThat(result.reimbursement().level()).isEqualTo("p30");
                    assertThat(result.reimbursement().announcementDate()).isEqualTo(ANNOUNCEMENT);
                });
    }

    @Test
    void returnsAtcAndRetailPriceForCatalogAndNothingForNfz() {
        transactionTemplate.executeWithoutResult(status ->
                repository.findByGtinIn(List.of("05909990000002")).forEach(row -> row.setAtc("A10BA02")));
        when(nfzDictionaryClient.searchProductNames(eq("siofor"), anyInt())).thenReturn(List.of("Siofor XR"));

        List<MedicationSearchResult> results = searchService.search("siofor", 10);

        assertThat(results.getFirst()).satisfies(siofor -> {
            assertThat(siofor.atc()).isEqualTo("A10BA02");
            assertThat(siofor.retailPrice()).isEqualByComparingTo("20.00");
            assertThat(siofor.reimbursement().indications())
                    .extracting(ReimbursementInfo.Indication::retailPrice)
                    .usingComparatorForType(BigDecimal::compareTo, BigDecimal.class)
                    .containsExactly(new BigDecimal("20.00"));
        });
        assertThat(results.get(1)).satisfies(nfz -> {
            assertThat(nfz.name()).isEqualTo("Siofor XR");
            assertThat(nfz.atc()).isNull();
            assertThat(nfz.retailPrice()).isNull();
        });
    }

    @Test
    void groupsIndicationsOfOneGtinAndPicksCheapestLevel() {
        MedicationSearchResult result = searchService.search("sorbalgon", 10).getFirst();

        assertThat(result.reimbursement().level()).isEqualTo("free");
        assertThat(result.reimbursement().indications())
                .extracting(ReimbursementInfo.Indication::text)
                .containsExactlyInAnyOrder("Owrzodzenia", "EB");
    }

    @Test
    void returnsEntitlementCodes() {
        // Repozytorium nie ma save dla uprawnień; importer też zapisuje je przez EntityManager.
        transactionTemplate.executeWithoutResult(status -> {
            entityManager.persist(new CatalogEntitlement("05909990000001", CatalogEntitlement.Code.S));
            entityManager.persist(new CatalogEntitlement("05909990000001", CatalogEntitlement.Code.DZ));
        });

        assertThat(searchService.search("metfogamma", 10).getFirst().reimbursement().freeFor())
                .containsExactlyInAnyOrder("S", "DZ");
    }

    @Test
    void treatsLikeWildcardsLiterally() {
        assertThat(searchService.search("50%_", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000003");
        assertThat(searchService.search("%%", 10)).isEmpty();
    }

    @Test
    void addsNfzProductsMissingFromCurrentListAsFullPrice() {
        when(nfzDictionaryClient.searchProductNames(eq("metf"), anyInt()))
                .thenReturn(List.of("Metfogamma 500", "Metformax 850"));

        List<MedicationSearchResult> results = searchService.search("metf", 10);

        // Metfogamma 500 jest w wykazie, więc z NFZ dochodzi tylko Metformax 850. Zaczyna się od zapytania,
        // więc wyprzedza Siofor (pasuje po substancji) i Bimetfo (tylko zawiera "metf").
        assertThat(results).extracting(MedicationSearchResult::name)
                .containsExactly("Metfogamma 500, tabl. powl., 500 mg", "Metformax 850",
                        "Siofor 1000, tabl. powl., 1000 mg", "Bimetfo Duo, tabl. powl., 50 mg");
        MedicationSearchResult metformax = results.get(1);
        assertThat(metformax.ean()).isNull();
        assertThat(metformax.reimbursement().level()).isEqualTo("full");
        assertThat(metformax.reimbursement().freeFor()).isEmpty();
    }

    @Test
    void skipsNfzWhenCatalogFillsTheLimit() {
        assertThat(searchService.search("metforminum", 2)).hasSize(2);
        verifyNoInteractions(nfzDictionaryClient);
    }

    @Test
    void findsLatinSubstancesByPolishNames() {
        assertThat(searchService.search("metformina", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000001", "05909990000002");
        assertThat(searchService.search("Lewotyroksyna", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000005");
        assertThat(searchService.search("metotreksat", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000006");
        assertThat(searchService.search("amoksycylina", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000007");
        assertThat(searchService.search("hydrokortyzon", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000008");
    }

    @Test
    void findsByAlias() {
        assertThat(searchService.search("kwas foliowy", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000009");
        assertThat(searchService.search("Kwas fol", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000009");
    }

    @Test
    void ranksNamePrefixThenSubstanceThenContains() {
        // "metfo": Metfogamma zaczyna się od zapytania, Siofor pasuje po substancji (metformina),
        // a Bimetfo tylko zawiera "metfo", choć alfabetycznie jest pierwsze.
        assertThat(searchService.search("metfo", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000001", "05909990000002", "05909990000004");
    }

    @Test
    void ranksSingleSubstanceBeforeCombination() {
        // Apap to czysty paracetamol, Doreta to tramadol + paracetamol, choć alfabetycznie jest pierwsza.
        assertThat(searchService.search("paracetamol", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000010", "05909990000011");
    }

    @Test
    void asksNfzWhenCatalogHasOnlyWeakMatchesEvenIfLimitIsFull() {
        // Jak w prawdziwym wykazie: brak czystego paracetamolu, są tylko połączenia z tramadolem.
        transactionTemplate.executeWithoutResult(status ->
                repository.deleteAllInBatch(repository.findByGtinIn(List.of("05909990000010"))));
        when(nfzDictionaryClient.searchProductNames(eq("paracetamol"), anyInt()))
                .thenReturn(List.of("Paracetamol Kabi", "Laboratoria Polfa Paracetamol"));

        // Doreta sama wypełnia limit 1, a mimo to Paracetamol Kabi z NFZ (nazwa od zapytania) ją wyprzedza.
        assertThat(searchService.search("paracetamol", 1)).extracting(MedicationSearchResult::name)
                .containsExactly("Paracetamol Kabi");
        // Słowo w nazwie z NFZ ma tę samą ocenę co słowo w substancji Doreta; przy remisie wykaz jest pierwszy.
        assertThat(searchService.search("paracetamol", 10)).extracting(MedicationSearchResult::name)
                .containsExactly("Paracetamol Kabi", "Doreta, tabl. powl., 37,5 mg + 325 mg",
                        "Laboratoria Polfa Paracetamol");
    }

    @Test
    void ranksMatchInsideWordLast() {
        // "met" w środku "Salmeterolum" (Aerox) i "Bimetfo" przegrywa z markami i substancjami na "met".
        assertThat(searchService.search("met", 10)).extracting(MedicationSearchResult::ean)
                .containsExactly("05909990000001", "05909990000006", "05909990000002",
                        "05909990000012", "05909990000004");
    }

    @Test
    void findsBrandRegardlessOfYOrI() {
        // Transliteracja po stronie frontu psuła marki ("euthirox" -> 0 wyników); backend sprawdza obie formy.
        for (String query : List.of("euthyrox", "Euthirox", "eutyroks")) {
            assertThat(searchService.search(query, 10)).extracting(MedicationSearchResult::ean)
                    .as(query)
                    .containsExactly("05909990000005");
        }
    }

    @Test
    void findsPolishSubstancesWithOrWithoutDiacritics() {
        for (String query : List.of("igły do penów", "igly do penow", "IGLY DO PENOW")) {
            assertThat(searchService.search(query, 10)).extracting(MedicationSearchResult::ean)
                    .as(query)
                    .containsExactly("05909990000013");
        }
        for (String query : List.of("szczepionka przeciw półpaścowi", "szczepionka przeciw polpascowi")) {
            assertThat(searchService.search(query, 10)).extracting(MedicationSearchResult::ean)
                    .as(query)
                    .containsExactly("05909990000014");
        }
    }

    @Test
    void polishAndLatinSpellingMeet() {
        assertThat(MedicationSearchService.spelling("Levothyroxinum"))
                .startsWith(MedicationSearchService.polishStem(MedicationSearchService.spelling("lewotyroksyna")));
        assertThat(MedicationSearchService.spelling("Methotrexatum"))
                .startsWith(MedicationSearchService.spelling("metotreksat"));
        assertThat(MedicationSearchService.spelling("Quetiapinum"))
                .startsWith(MedicationSearchService.polishStem(MedicationSearchService.spelling("kwetiapina")));
    }

    @Test
    void ignoresTooShortQueries() {
        assertThat(searchService.search(" m ", 10)).isEmpty();
    }

    private static CatalogMedication row(String gtin, String name, String substance,
                                         ReimbursementLevel level, String indication) {
        CatalogMedication medication = new CatalogMedication();
        medication.setGtin(gtin);
        medication.setName(name);
        medication.setActiveSubstance(substance);
        medication.setPackSize("30 szt.");
        medication.setLevel(level);
        medication.setRetailPrice(new BigDecimal("20.00"));
        medication.setPatientSurcharge(new BigDecimal("5.00"));
        medication.setIndication(indication);
        medication.setAnnouncementDate(ANNOUNCEMENT);
        return medication;
    }
}
