package pl.dziennikzdrowia.medication.catalog;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * {@code level} to najkorzystniejszy poziom spośród wskazań. Gdy wskazań jest kilka,
 * {@code indications} mówi, w jakiej chorobie który poziom obowiązuje.
 */
public record ReimbursementInfo(
        String level,
        List<String> freeFor,
        LocalDate announcementDate,
        List<Indication> indications) {

    /** {@code retailPrice} to cena opakowania; w obwieszczeniu jest taka sama we wszystkich wskazaniach GTIN-u. */
    public record Indication(String text, String level, BigDecimal patientSurcharge, BigDecimal retailPrice) {
    }
}
