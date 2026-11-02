package pl.dziennikzdrowia.screening;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Body POST /api/me/screenings - oznaczenie badania jako wykonanego.
 * To, ze data nie jest z przyszlosci, sprawdza serwis (wg strefy Europe/Warsaw, nie serwera).
 */
public record UserScreeningRequest(
        @NotBlank String ruleId,
        @NotNull LocalDate performedOn,
        @Size(max = 1000) String notes
) {
}
