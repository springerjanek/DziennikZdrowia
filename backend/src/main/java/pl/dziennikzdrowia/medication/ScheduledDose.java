package pl.dziennikzdrowia.medication;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ScheduledDose(
        LocalDate date,
        LocalTime time,
        UUID medicationId,
        String medicationName,
        BigDecimal amount,
        DoseUnit unit,
        String instruction) {
}
