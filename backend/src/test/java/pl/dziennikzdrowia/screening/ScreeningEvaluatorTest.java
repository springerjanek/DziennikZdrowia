package pl.dziennikzdrowia.screening;

import org.junit.jupiter.api.Test;
import pl.dziennikzdrowia.user.Sex;

import java.time.LocalDate;
import java.util.List;
import java.util.OptionalInt;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class ScreeningEvaluatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 2);

    private static ScreeningRule mammography() {
        ScreeningRule rule = new ScreeningRule();
        rule.setId("mammography");
        rule.setSource(RuleSource.PROGRAM_NFZ);
        rule.setAgeBasis(AgeBasis.YEAR);
        rule.setSex(Sex.FEMALE);
        rule.setAgeFrom(45);
        rule.setAgeTo(74);
        rule.getIntervals().add(new AgeBand(45, 24));
        return rule;
    }

    private static ScreeningRule mojeZdrowie() {
        ScreeningRule rule = new ScreeningRule();
        rule.setId("moje_zdrowie");
        rule.setAgeBasis(AgeBasis.YEAR);
        rule.setAgeFrom(20);
        rule.getIntervals().addAll(List.of(new AgeBand(20, 60), new AgeBand(50, 36)));
        return rule;
    }

    private static ScreeningRule hba1c() {
        ScreeningRule rule = new ScreeningRule();
        rule.setId("hba1c");
        rule.setAgeBasis(AgeBasis.COMPLETED);
        rule.getAnyCondition().addAll(Set.of("diabetes_t1", "diabetes_t2"));
        rule.getIntervals().add(new AgeBand(0, 6));
        return rule;
    }

    private static HealthProfile woman(int birthYear, int birthMonth, String... conditions) {
        return new HealthProfile(birthYear, birthMonth, Sex.FEMALE, Set.of(conditions));
    }

    @Test
    void ageByYearIgnoresBirthMonth() {
        // Urodzona w grudniu 1981 - w listopadzie 2026 rocznikowo 45, ale ukonczone 44.
        HealthProfile profile = woman(1981, 12);

        assertThat(profile.ageByYear(TODAY)).isEqualTo(45);
        assertThat(profile.ageCompleted(TODAY)).isEqualTo(44);
    }

    @Test
    void birthdayMonthCountsAsCompleted() {
        assertThat(woman(1976, 11).ageCompleted(TODAY)).isEqualTo(50);
    }

    @Test
    void mammographyUsesYearAgeForNfzProgram() {
        // Rocznikowo 45 -> juz uprawniona, mimo ze 45 lat skonczy dopiero w grudniu.
        assertThat(ScreeningEvaluator.isEligible(mammography(), woman(1981, 12), TODAY)).isTrue();
        assertThat(ScreeningEvaluator.isEligible(mammography(), woman(1982, 1), TODAY)).isFalse();
    }

    @Test
    void mammographyRespectsUpperAgeAndSex() {
        assertThat(ScreeningEvaluator.isEligible(mammography(), woman(1952, 1), TODAY)).isTrue();  // 74
        assertThat(ScreeningEvaluator.isEligible(mammography(), woman(1951, 1), TODAY)).isFalse(); // 75

        HealthProfile man = new HealthProfile(1970, 1, Sex.MALE, Set.of());
        assertThat(ScreeningEvaluator.isEligible(mammography(), man, TODAY)).isFalse();
    }

    @Test
    void conditionRuleRequiresAnyOfConditions() {
        assertThat(ScreeningEvaluator.isEligible(hba1c(), woman(1990, 1, "diabetes_t2"), TODAY)).isTrue();
        assertThat(ScreeningEvaluator.isEligible(hba1c(), woman(1990, 1, "asthma"), TODAY)).isFalse();
        assertThat(ScreeningEvaluator.isEligible(hba1c(), woman(1990, 1), TODAY)).isFalse();
    }

    @Test
    void intervalPicksHighestMatchingBand() {
        assertThat(ScreeningEvaluator.intervalMonths(mojeZdrowie(), 30)).isEqualTo(OptionalInt.of(60));
        assertThat(ScreeningEvaluator.intervalMonths(mojeZdrowie(), 50)).isEqualTo(OptionalInt.of(36));
        assertThat(ScreeningEvaluator.intervalMonths(mojeZdrowie(), 19)).isEmpty();
    }

    @Test
    void statusDependsOnLastPerformed() {
        ScreeningRule rule = mammography();

        assertThat(ScreeningService.toDue(rule, 24, null, TODAY).status()).isEqualTo(ScreeningStatus.NEVER_DONE);

        DueScreeningResponse due = ScreeningService.toDue(rule, 24, LocalDate.of(2024, 11, 2), TODAY);
        assertThat(due.nextDueOn()).isEqualTo(LocalDate.of(2026, 11, 2));
        assertThat(due.status()).isEqualTo(ScreeningStatus.DUE);

        DueScreeningResponse upcoming = ScreeningService.toDue(rule, 24, LocalDate.of(2025, 6, 1), TODAY);
        assertThat(upcoming.nextDueOn()).isEqualTo(LocalDate.of(2027, 6, 1));
        assertThat(upcoming.status()).isEqualTo(ScreeningStatus.UPCOMING);
    }
}
