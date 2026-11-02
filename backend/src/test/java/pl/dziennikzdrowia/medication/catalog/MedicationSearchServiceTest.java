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
                row("05909990000003", "Sorbalgon 50%_test, opatrunek", "Alginat", ReimbursementLevel.FREE, "EB")));
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

        // Siofor pasuje po substancji. Metfogamma 500 jest w wykazie, więc z NFZ dochodzi tylko Metformax 850.
        assertThat(results).extracting(MedicationSearchResult::name)
                .containsExactly("Metfogamma 500, tabl. powl., 500 mg", "Siofor 1000, tabl. powl., 1000 mg",
                        "Metformax 850");
        MedicationSearchResult metformax = results.get(2);
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
