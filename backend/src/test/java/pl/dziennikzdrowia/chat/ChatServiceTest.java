package pl.dziennikzdrowia.chat;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ChatServiceTest {

    private final GeminiClient gemini = mock(GeminiClient.class);
    private final ChatRateLimiter rateLimiter = new ChatRateLimiter();
    private final ChatService service = new ChatService(gemini, rateLimiter);

    @Test
    void sendsSystemPromptAndConversationToModel() {
        List<ChatMessage> messages = List.of(new ChatMessage("user", "Jak często robić morfologię?"));
        when(gemini.generate(ChatService.SYSTEM_PROMPT, messages)).thenReturn("Zwykle raz w roku.");

        assertThat(service.reply(UUID.randomUUID(), messages)).isEqualTo("Zwykle raz w roku.");
        verify(gemini).generate(ChatService.SYSTEM_PROMPT, messages);
    }

    @Test
    void doesNotCallModelWhenLastMessageIsNotFromUser() {
        List<ChatMessage> messages = List.of(
                new ChatMessage("user", "Cześć"),
                new ChatMessage("assistant", "Cześć! W czym pomóc?"));

        assertThatThrownBy(() -> service.reply(UUID.randomUUID(), messages))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(400));
        verifyNoInteractions(gemini);
    }

    @Test
    void doesNotCallModelAfterRateLimitIsExceeded() {
        UUID user = UUID.randomUUID();
        List<ChatMessage> messages = List.of(new ChatMessage("user", "Pytanie"));
        when(gemini.generate(ChatService.SYSTEM_PROMPT, messages)).thenReturn("Odpowiedź");

        for (int i = 0; i < 8; i++) {
            service.reply(user, messages);
        }

        assertThatThrownBy(() -> service.reply(user, messages))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(429));
        // 8 udanych zapytań, a dziewiąte nie doszło do modelu.
        org.mockito.Mockito.verify(gemini, org.mockito.Mockito.times(8)).generate(ChatService.SYSTEM_PROMPT, messages);
    }

    @Test
    void systemPromptForbidsDiagnosesAndPointsToEmergencyNumber() {
        assertThat(ChatService.SYSTEM_PROMPT).contains("Nie stawiasz diagnoz").contains("112");
    }
}
