package pl.dziennikzdrowia.medication.catalog;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Raz na dobę sprawdza, czy obowiązuje nowe obwieszczenie MZ, i jeśli tak,
 * podmienia cały katalog w jednej transakcji (wyszukiwarka nigdy nie widzi pustej tabeli).
 */
@Component
@ConditionalOnProperty(name = "app.reimbursement.import-enabled", havingValue = "true", matchIfMissing = true)
public class ReimbursementImporter {

    private static final Logger log = LoggerFactory.getLogger(ReimbursementImporter.class);

    private final GovPlAnnouncementLocator locator;
    private final AnnouncementXlsxParser parser;
    private final CatalogMedicationRepository repository;
    private final CatalogEntitlementRepository entitlementRepository;
    private final TransactionTemplate transactionTemplate;
    private final RplAtcClient rplAtcClient;

    public ReimbursementImporter(GovPlAnnouncementLocator locator,
                                 AnnouncementXlsxParser parser,
                                 CatalogMedicationRepository repository,
                                 CatalogEntitlementRepository entitlementRepository,
                                 TransactionTemplate transactionTemplate,
                                 RplAtcClient rplAtcClient) {
        this.locator = locator;
        this.parser = parser;
        this.repository = repository;
        this.entitlementRepository = entitlementRepository;
        this.transactionTemplate = transactionTemplate;
        this.rplAtcClient = rplAtcClient;
    }

    @Scheduled(initialDelayString = "${app.reimbursement.initial-delay}", fixedDelayString = "${app.reimbursement.check-interval}")
    public void importIfNewer() {
        try {
            importIfNewer(LocalDate.now());
        } catch (Exception e) {
            log.warn("Nie udało się zaimportować wykazu leków refundowanych", e);
        }
    }

    void importIfNewer(LocalDate today) throws IOException {
        Optional<Announcement> found = locator.findCurrent(today);
        if (found.isEmpty()) {
            log.warn("Nie znaleziono obowiązującego obwieszczenia na gov.pl");
            return;
        }

        Announcement announcement = found.get();
        Optional<LocalDate> current = repository.findCurrentAnnouncementDate();
        boolean newer = current.isEmpty() || announcement.effectiveDate().isAfter(current.get());
        if (!newer) {
            // Wykaz aktualny; jeśli brak w nim ATC (pierwsze uruchomienie po dodaniu kolumny
            // albo RPL nie odpowiedział przy imporcie), uzupełniamy same kody.
            if (!repository.existsByAtcIsNotNull()) {
                fillMissingAtc();
            }
            return;
        }

        log.info("Import wykazu leków refundowanych na {} z {}", announcement.effectiveDate(), announcement.pageUrl());
        byte[] xlsx = locator.downloadXlsx(announcement);
        ParsedAnnouncement parsed = parser.parse(new ByteArrayInputStream(xlsx), announcement.effectiveDate());
        Map<String, String> atcByGtin = atcByGtin();
        parsed.medications().forEach(medication -> medication.setAtc(atcByGtin.get(medication.getGtin())));

        transactionTemplate.executeWithoutResult(status -> {
            repository.deleteAllInBatch();
            repository.deleteAllEntitlements();
            repository.saveAll(parsed.medications());
            entitlementRepository.saveAll(parsed.entitlements());
        });
        log.info("Zaimportowano {} pozycji ({} z kodem ATC) i {} uprawnień S/DZ/C",
                parsed.medications().size(),
                parsed.medications().stream().filter(medication -> medication.getAtc() != null).count(),
                parsed.entitlements().size());
    }

    private void fillMissingAtc() {
        Map<String, String> atcByGtin = atcByGtin();
        if (atcByGtin.isEmpty()) {
            return;
        }
        Long filled = transactionTemplate.execute(status -> {
            List<CatalogMedication> medications = repository.findAll();
            medications.forEach(medication -> medication.setAtc(atcByGtin.get(medication.getGtin())));
            return medications.stream().filter(medication -> medication.getAtc() != null).count();
        });
        log.info("Uzupełniono kody ATC z Rejestru Produktów Leczniczych: {} pozycji", filled);
    }

    /** Pusta mapa, gdy rejestr nie odpowiada: wykaz z cenami jest ważniejszy niż ATC. */
    private Map<String, String> atcByGtin() {
        try {
            return rplAtcClient.downloadAtcByGtin();
        } catch (Exception e) {
            log.warn("Nie udało się pobrać kodów ATC z Rejestru Produktów Leczniczych", e);
            return Map.of();
        }
    }
}
