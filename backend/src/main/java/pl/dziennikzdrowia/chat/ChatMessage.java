package pl.dziennikzdrowia.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Jedna wiadomość w rozmowie. Rola: "user" (użytkownik) albo "assistant" (bot). */
public record ChatMessage(
        @NotBlank @Pattern(regexp = "user|assistant") String role,
        @NotBlank @Size(max = 2000) String content) {
}
