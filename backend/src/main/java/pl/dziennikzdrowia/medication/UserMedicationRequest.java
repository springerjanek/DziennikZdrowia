package pl.dziennikzdrowia.medication;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

/**
 * Dodanie albo edycja leku. Zależności między polami (np. WEEKDAYS wymaga dni)
 * sprawdza {@link UserMedicationService}.
 */
public record UserMedicationRequest(
        @Pattern(regexp = "\\d{8,14}") String gtin,
        @NotBlank @Size(max = 500) String name,
        @Size(max = 500) String activeSubstance,
        @NotNull ScheduleType scheduleType,
        Set<DayOfWeek> weekdays,
        @Min(2) @Max(365) Integer intervalDays,
        @Min(1) @Max(24) Integer maxDailyDoses,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @Size(max = 1000) String notes,
        @NotEmpty @Size(max = 24) List<@Valid @NotNull Dose> doses) {

    public record Dose(
            LocalTime time,
            @NotNull @Positive @Digits(integer = 7, fraction = 3) BigDecimal amount,
            @NotNull DoseUnit unit,
            @Size(max = 200) String instruction) {
    }
}
