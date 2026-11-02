package pl.dziennikzdrowia.medication;

import pl.dziennikzdrowia.medication.catalog.ReimbursementInfo;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public record UserMedicationResponse(
        UUID id,
        String gtin,
        String name,
        String activeSubstance,
        ScheduleType scheduleType,
        Set<DayOfWeek> weekdays,
        Integer intervalDays,
        Integer maxDailyDoses,
        LocalDate startDate,
        LocalDate endDate,
        String notes,
        List<Dose> doses,
        // Z aktualnego wykazu MZ; "full", gdy leku w nim nie ma albo dodano go ręcznie.
        ReimbursementInfo reimbursement) {

    public record Dose(LocalTime time, BigDecimal amount, DoseUnit unit, String instruction) {
    }

    static UserMedicationResponse from(UserMedication medication, ReimbursementInfo reimbursement) {
        List<Dose> doses = medication.getDoses().stream()
                .map(dose -> new Dose(dose.getTime(), dose.getAmount(), dose.getUnit(), dose.getInstruction()))
                .toList();
        return new UserMedicationResponse(
                medication.getId(),
                medication.getGtin(),
                medication.getName(),
                medication.getActiveSubstance(),
                medication.getScheduleType(),
                Set.copyOf(medication.getWeekdays()),
                medication.getIntervalDays(),
                medication.getMaxDailyDoses(),
                medication.getStartDate(),
                medication.getEndDate(),
                medication.getNotes(),
                doses,
                reimbursement);
    }
}
