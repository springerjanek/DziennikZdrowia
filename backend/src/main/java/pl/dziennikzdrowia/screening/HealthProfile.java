package pl.dziennikzdrowia.screening;

import pl.dziennikzdrowia.user.Sex;
import pl.dziennikzdrowia.user.User;

import java.time.LocalDate;
import java.util.Set;

/**
 * Dane uzytkownika potrzebne do dobrania badan - niezalezne od encji, zeby ScreeningEvaluator
 * dalo sie testowac bez bazy.
 */
public record HealthProfile(int birthYear, int birthMonth, Sex sex, Set<String> conditions) {

    public static HealthProfile from(User user) {
        return new HealthProfile(user.getBirthYear(), user.getBirthMonth(), user.getSex(),
                Set.copyOf(user.getConditions()));
    }

    /** Wiek rocznikowy - tak licza programy NFZ. Tak samo jak ageByYear na froncie. */
    public int ageByYear(LocalDate today) {
        return today.getYear() - birthYear;
    }

    /**
     * Ukonczone lata. Znamy tylko miesiac urodzenia, wiec w miesiacu urodzin liczymy rok jako ukonczony.
     * Tak samo jak ageInYearsCompleted na froncie.
     */
    public int ageCompleted(LocalDate today) {
        int totalMonths = (today.getYear() - birthYear) * 12 + (today.getMonthValue() - birthMonth);
        return Math.floorDiv(totalMonths, 12);
    }

    public int ageFor(AgeBasis basis, LocalDate today) {
        return basis == AgeBasis.YEAR ? ageByYear(today) : ageCompleted(today);
    }
}
