package pl.dziennikzdrowia.screening;

import pl.dziennikzdrowia.user.Sex;

import java.time.LocalDate;
import java.util.List;

/**
 * Regula z katalogu w ksztalcie ScreeningRule z frontu (GET /api/screening/rules).
 */
public record ScreeningRuleResponse(
        String id,
        String label,
        String rationale,
        RuleSource source,
        AgeBasis ageBasis,
        Eligibility eligibility,
        List<Interval> intervals,
        String nfzBenefit,
        String sourceUrl,
        LocalDate verifiedAt
) {

    public record Eligibility(Sex sex, Integer ageFrom, Integer ageTo, List<String> anyCondition) {
    }

    public record Interval(int ageFrom, int intervalMonths) {
    }

    public static ScreeningRuleResponse from(ScreeningRule rule) {
        return new ScreeningRuleResponse(
                rule.getId(),
                rule.getLabel(),
                rule.getRationale(),
                rule.getSource(),
                rule.getAgeBasis(),
                new Eligibility(rule.getSex(), rule.getAgeFrom(), rule.getAgeTo(),
                        rule.getAnyCondition().stream().sorted().toList()),
                rule.getIntervals().stream()
                        .map(band -> new Interval(band.getAgeFrom(), band.getIntervalMonths()))
                        .toList(),
                rule.getNfzBenefit(),
                rule.getSourceUrl(),
                rule.getVerifiedAt());
    }
}
