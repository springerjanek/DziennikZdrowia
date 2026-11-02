package pl.dziennikzdrowia.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleSignInRequest(@NotBlank String credential) {
}
