package pl.dziennikzdrowia.chat;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Bez sieci: sprawdzamy brak klucza i czytanie odpowiedzi Gemini. */
class GeminiClientTest {

    private static final String FALLBACK = "brak odpowiedzi";

    @Test
    void withoutApiKeyReturnsServiceUnavailableWithoutCallingGoogle() {
        GeminiClient client = new GeminiClient("https://example.invalid/v1beta", "", "model-testowy");

        assertThatThrownBy(() -> client.generate("prompt", List.of(new ChatMessage("user", "Cześć"))))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(503));
    }

    @Test
    void readsFirstTextOfFirstCandidate() {
        var response = new GeminiClient.GeminiResponse(List.of(
                new GeminiClient.GeminiResponse.Candidate(new GeminiClient.GeminiResponse.Content(List.of(
                        new GeminiClient.GeminiResponse.Part("Pierwsza odpowiedź"),
                        new GeminiClient.GeminiResponse.Part("Druga"))))));

        assertThat(response.firstText(FALLBACK)).isEqualTo("Pierwsza odpowiedź");
    }

    @Test
    void returnsFallbackWhenGeminiBlocksTheAnswer() {
        // Filtr bezpieczeństwa Gemini: brak kandydatów albo kandydat bez treści.
        assertThat(new GeminiClient.GeminiResponse(null).firstText(FALLBACK)).isEqualTo(FALLBACK);
        assertThat(new GeminiClient.GeminiResponse(List.of()).firstText(FALLBACK)).isEqualTo(FALLBACK);
        assertThat(new GeminiClient.GeminiResponse(List.of(new GeminiClient.GeminiResponse.Candidate(null)))
                .firstText(FALLBACK)).isEqualTo(FALLBACK);
        assertThat(new GeminiClient.GeminiResponse(List.of(new GeminiClient.GeminiResponse.Candidate(
                new GeminiClient.GeminiResponse.Content(List.of())))).firstText(FALLBACK)).isEqualTo(FALLBACK);
    }
}
