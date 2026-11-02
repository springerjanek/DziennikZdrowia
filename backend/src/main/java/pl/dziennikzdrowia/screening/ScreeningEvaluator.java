package pl.dziennikzdrowia.screening;

import java.time.LocalDate;
import java.util.OptionalInt;

/**
 * Czysta logika regul (bez Springa i bazy): czy regula dotyczy osoby i jak czesto powtarzac badanie.
 * Odpowiednik isEligible / intervalForAge z frontend/src/domain/screening.ts - zmiany wprowadzaj w obu miejscach.
 */
public final class ScreeningEvaluator {

    private ScreeningEvaluator() {
    }

    public static boolean isEligible(ScreeningRule rule, HealthProfile profile, LocalDate today) {
        if (rule.getSex() != null && rule.getSex() != profile.sex()) {
            return false;
        }

        if (!rule.getAnyCondition().isEmpty()
                && rule.getAnyCondition().stream().noneMatch(profile.conditions()::contains)) {
            return false;
        }

        int age = profile.ageFor(rule.getAgeBasis(), today);
        if (rule.getAgeFrom() != null && age < rule.getAgeFrom()) {
            return false;
        }
        if (rule.getAgeTo() != null && age > rule.getAgeTo()) {
            return false;
        }
        return true;
    }

    /**
     * Czestotliwosc dla danego wieku: przedzial z najwiekszym ageFrom, ktory jest <= wiek.
     * Pusto, gdy zaden przedzial jeszcze nie obowiazuje.
     */
    public static OptionalInt intervalMonths(ScreeningRule rule, int age) {
        AgeBand matched = null;
        for (AgeBand band : rule.getIntervals()) {
            if (age >= band.getAgeFrom() && (matched == null || band.getAgeFrom() > matched.getAgeFrom())) {
                matched = band;
            }
        }
        return matched == null ? OptionalInt.empty() : OptionalInt.of(matched.getIntervalMonths());
    }
}
