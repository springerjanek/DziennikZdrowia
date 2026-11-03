package pl.dziennikzdrowia.user;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

/**
 * Body PUT /api/me/profile. Reguly, ktorych nie da sie wyrazic adnotacjami
 * (data z przyszlosci, nieznana choroba), sprawdza UserService.
 */
public record UserProfileRequest(
        @NotNull @Min(1900) Integer birthYear,
        @NotNull @Min(1) @Max(12) Integer birthMonth,
        @NotNull Sex sex,
        @NotNull Set<String> conditions
) {
}
