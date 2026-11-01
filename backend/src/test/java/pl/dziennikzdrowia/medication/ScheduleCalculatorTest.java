package pl.dziennikzdrowia.medication;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class ScheduleCalculatorTest {

    // Poniedziałek.
    private static final LocalDate MONDAY = LocalDate.of(2026, 10, 19);

    private final ScheduleCalculator calculator = new ScheduleCalculator();

    @Test
    void dailyWithDifferentDosesAtDifferentTimes() {
        UserMedication medication = medication("Metformax", ScheduleType.DAILY, MONDAY,
                dose("08:00", "1"), dose("20:00", "0.5"));

        List<ScheduledDose> doses = calculator.expand(List.of(medication), MONDAY, MONDAY.plusDays(1));

        assertThat(doses)
                .extracting(ScheduledDose::date, ScheduledDose::time, ScheduledDose::amount)
                .containsExactly(
                        tuple(MONDAY, LocalTime.of(8, 0), new BigDecimal("1")),
                        tuple(MONDAY, LocalTime.of(20, 0), new BigDecimal("0.5")),
                        tuple(MONDAY.plusDays(1), LocalTime.of(8, 0), new BigDecimal("1")),
                        tuple(MONDAY.plusDays(1), LocalTime.of(20, 0), new BigDecimal("0.5")));
    }

    @Test
    void weekdaysOnlyOnSelectedDays() {
        UserMedication medication = medication("Metotreksat", ScheduleType.WEEKDAYS, MONDAY, dose("09:00", "1"));
        medication.setWeekdays(EnumSet.of(DayOfWeek.WEDNESDAY, DayOfWeek.SATURDAY));

        List<ScheduledDose> doses = calculator.expand(List.of(medication), MONDAY, MONDAY.plusDays(6));

        assertThat(doses).extracting(ScheduledDose::date)
                .containsExactly(MONDAY.plusDays(2), MONDAY.plusDays(5));
    }

    @Test
    void everyNDaysCountsFromStartDateEvenWhenRangeStartsLater() {
        UserMedication medication = medication("Witamina D", ScheduleType.EVERY_N_DAYS, MONDAY, dose("10:00", "1"));
        medication.setIntervalDays(3);

        List<ScheduledDose> doses = calculator.expand(List.of(medication), MONDAY.plusDays(1), MONDAY.plusDays(9));

        assertThat(doses).extracting(ScheduledDose::date)
                .containsExactly(MONDAY.plusDays(3), MONDAY.plusDays(6), MONDAY.plusDays(9));
    }

    @Test
    void respectsStartAndEndDates() {
        UserMedication medication = medication("Antybiotyk", ScheduleType.DAILY, MONDAY.plusDays(1), dose("12:00", "1"));
        medication.setEndDate(MONDAY.plusDays(2));

        List<ScheduledDose> doses = calculator.expand(List.of(medication), MONDAY, MONDAY.plusDays(6));

        assertThat(doses).extracting(ScheduledDose::date)
                .containsExactly(MONDAY.plusDays(1), MONDAY.plusDays(2));
    }

    @Test
    void asNeededIsNotScheduled() {
        UserMedication medication = medication("Ibuprom", ScheduleType.AS_NEEDED, MONDAY, dose(null, "1"));

        assertThat(calculator.expand(List.of(medication), MONDAY, MONDAY.plusDays(6))).isEmpty();
    }

    @Test
    void sortsAcrossMedicationsByDateAndTime() {
        UserMedication evening = medication("Atoris", ScheduleType.DAILY, MONDAY, dose("21:00", "1"));
        UserMedication morning = medication("Euthyrox", ScheduleType.DAILY, MONDAY, dose("06:30", "1"));

        List<ScheduledDose> doses = calculator.expand(List.of(evening, morning), MONDAY, MONDAY);

        assertThat(doses).extracting(ScheduledDose::medicationName).containsExactly("Euthyrox", "Atoris");
    }

    private static UserMedication medication(String name, ScheduleType type, LocalDate start, MedicationDose... doses) {
        UserMedication medication = new UserMedication();
        medication.setId(UUID.randomUUID());
        medication.setName(name);
        medication.setScheduleType(type);
        medication.setStartDate(start);
        medication.replaceDoses(List.of(doses));
        return medication;
    }

    private static MedicationDose dose(String time, String amount) {
        MedicationDose dose = new MedicationDose();
        dose.setTime(time == null ? null : LocalTime.parse(time));
        dose.setAmount(new BigDecimal(amount));
        dose.setUnit(DoseUnit.TABLET);
        return dose;
    }
}
