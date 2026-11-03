package pl.dziennikzdrowia.screening;

import java.time.LocalDate;

/**
 * Badanie nalezne uzytkownikowi (GET /api/me/screenings).
 * lastPerformedOn i nextDueOn sa null, gdy badania jeszcze nie bylo w historii.
 */
public record DueScreeningResponse(
        String ruleId,
        String label,
        String rationale,
        RuleSource source,
        String nfzBenefit,
        int intervalMonths,
        LocalDate lastPerformedOn,
        LocalDate nextDueOn,
        ScreeningStatus status
) {
}
