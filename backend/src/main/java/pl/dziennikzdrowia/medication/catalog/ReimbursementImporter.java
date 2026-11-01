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

    public ReimbursementImporter(GovPlAnnouncementLocator locator,
                                 AnnouncementXlsxParser parser,
                                 CatalogMedicationRepository repository,
                                 CatalogEntitlementRepository entitlementRepository,
                                 TransactionTemplate transactionTemplate) {
        this.locator = locator;
        this.parser = parser;
        this.repository = repository;
        this.entitlementRepository = entitlementRepository;
        this.transactionTemplate = transactionTemplate;
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
        if (current.isPresent() && !announcement.effectiveDate().isAfter(current.get())) {
            return;
        }

        log.info("Import wykazu leków refundowanych na {} z {}", announcement.effectiveDate(), announcement.pageUrl());
        byte[] xlsx = locator.downloadXlsx(announcement);
        ParsedAnnouncement parsed = parser.parse(new ByteArrayInputStream(xlsx), announcement.effectiveDate());

        transactionTemplate.executeWithoutResult(status -> {
            repository.deleteAllInBatch();
            repository.deleteAllEntitlements();
            repository.saveAll(parsed.medications());
            entitlementRepository.saveAll(parsed.entitlements());
        });
        log.info("Zaimportowano {} pozycji i {} uprawnień S/DZ/C",
                parsed.medications().size(), parsed.entitlements().size());
    }
}
