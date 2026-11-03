package pl.dziennikzdrowia.screening;

import pl.dziennikzdrowia.user.Sex;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Jedna regula w postaci z pliku screening-rules.json (przed zapisem do bazy).
 * Osobny rekord zamiast encji, zeby format pliku nie zalezal od szczegolow JPA.
 */
public record ScreeningRuleDefinition(
        String id,
        String label,
        String rationale,
        RuleSource source,
        AgeBasis ageBasis,
        Sex sex,
        Integer ageFrom,
        Integer ageTo,
        String nfzBenefit,
        String sourceUrl,
        LocalDate verifiedAt,
        List<Interval> intervals,
        Set<String> anyCondition
) {

    public record Interval(int ageFrom, int intervalMonths) {
    }
}
