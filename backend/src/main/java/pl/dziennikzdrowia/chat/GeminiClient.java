package pl.dziennikzdrowia.chat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Klient Gemini API (generateContent). Klucz zostaje w backendzie - frontend pyta nasz /api/chat.
 * Tak samo zbudowany jest KolejkiSorClient.
 */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private static final String EMPTY_REPLY =
            "Nie udało mi się odpowiedzieć na to pytanie. Spróbuj sformułować je inaczej.";

    private final RestClient restClient;
    private final String model;
    private final boolean configured;

    public GeminiClient(@Value("${app.chat.api-url}") String apiUrl,
                        @Value("${app.chat.api-key:}") String apiKey,
                        @Value("${app.chat.model}") String model) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        // Model generuje odpowiedź dłużej niż zwykłe API.
        requestFactory.setReadTimeout(Duration.ofSeconds(30));
        this.restClient = RestClient.builder()
                .baseUrl(apiUrl)
                .requestFactory(requestFactory)
                .defaultHeader("x-goog-api-key", apiKey)
                .build();
        this.model = model;
        this.configured = !apiKey.isBlank();
    }

    /** Odpowiedź modelu. 503, gdy brak klucza lub Gemini nie działa; 429, gdy Google ucina limit. */
    public String generate(String systemPrompt, List<ChatMessage> messages) {
        if (!configured) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Brak GEMINI_API_KEY w konfiguracji");
        }

        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                // Gemini nazywa rolę bota "model", nie "assistant".
                "contents", messages.stream()
                        .map(m -> Map.of(
                                "role", "assistant".equals(m.role()) ? "model" : "user",
                                "parts", List.of(Map.of("text", m.content()))))
                        .toList(),
                "generationConfig", Map.of("maxOutputTokens", 800));

        try {
            GeminiResponse response = restClient.post()
                    .uri("/models/{model}:generateContent", model)
                    .body(body)
                    .retrieve()
                    .body(GeminiResponse.class);
            return response == null ? EMPTY_REPLY : response.firstText(EMPTY_REPLY);
        } catch (RestClientResponseException e) {
            log.warn("Gemini odpowiedział błędem {}", e.getStatusCode().value());
            // Nie przekazujemy treści błędu Google dalej - mogłaby zdradzić szczegóły konfiguracji.
            HttpStatus status = e.getStatusCode().value() == 429
                    ? HttpStatus.TOO_MANY_REQUESTS
                    : HttpStatus.SERVICE_UNAVAILABLE;
            throw new ResponseStatusException(status, "Asystent jest chwilowo niedostępny");
        } catch (RestClientException e) {
            log.warn("Nie udało się połączyć z Gemini: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Asystent jest chwilowo niedostępny");
        }
    }

    record GeminiResponse(List<Candidate> candidates) {
        record Candidate(Content content) {
        }

        record Content(List<Part> parts) {
        }

        record Part(String text) {
        }

        /** Pusta lista kandydatów zdarza się, gdy filtr bezpieczeństwa Gemini zablokuje odpowiedź. */
        String firstText(String fallback) {
            if (candidates == null || candidates.isEmpty()) {
                return fallback;
            }
            Content content = candidates.get(0).content();
            if (content == null || content.parts() == null || content.parts().isEmpty()
                    || content.parts().get(0).text() == null) {
                return fallback;
            }
            return content.parts().get(0).text();
        }
    }
}
