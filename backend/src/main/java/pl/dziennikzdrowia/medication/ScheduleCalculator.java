package pl.dziennikzdrowia.medication;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Rozwija harmonogramy leków w listę dawek w podanym przedziale dat. */
@Component
public class ScheduleCalculator {

    /**
     * Dawki od {@code from} do {@code to} włącznie, posortowane po dacie i godzinie.
     * Leki "w razie potrzeby" nie mają stałych godzin, więc ich tu nie ma.
     */
    public List<ScheduledDose> expand(List<UserMedication> medications, LocalDate from, LocalDate to) {
        List<ScheduledDose> result = new ArrayList<>();
        for (UserMedication medication : medications) {
            if (medication.getScheduleType() == ScheduleType.AS_NEEDED) {
                continue;
            }

            LocalDate first = later(from, medication.getStartDate());
            LocalDate last = medication.getEndDate() == null ? to : earlier(to, medication.getEndDate());
            for (LocalDate date = first; !date.isAfter(last); date = date.plusDays(1)) {
                if (!takesOn(medication, date)) {
                    continue;
                }
                for (MedicationDose dose : medication.getDoses()) {
                    result.add(new ScheduledDose(date, dose.getTime(), medication.getId(), medication.getName(),
                            dose.getAmount(), dose.getUnit(), dose.getInstruction()));
                }
            }
        }

        result.sort(Comparator.comparing(ScheduledDose::date)
                .thenComparing(ScheduledDose::time)
                .thenComparing(ScheduledDose::medicationName));
        return result;
    }

    static boolean takesOn(UserMedication medication, LocalDate date) {
        return switch (medication.getScheduleType()) {
            case DAILY -> true;
            case WEEKDAYS -> medication.getWeekdays().contains(date.getDayOfWeek());
            case EVERY_N_DAYS ->
                    ChronoUnit.DAYS.between(medication.getStartDate(), date) % medication.getIntervalDays() == 0;
            case AS_NEEDED -> false;
        };
    }

    private static LocalDate later(LocalDate a, LocalDate b) {
        return a.isAfter(b) ? a : b;
    }

    private static LocalDate earlier(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }
}
