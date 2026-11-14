package pl.dziennikzdrowia.chat;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Cała dotychczasowa rozmowa; ostatnia wiadomość to pytanie użytkownika. Backend nie trzyma historii. */
public record ChatRequest(@NotEmpty @Size(max = 20) List<@Valid ChatMessage> messages) {
}
