package pl.dziennikzdrowia.chat;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatRateLimiterTest {

    private final ChatRateLimiter limiter = new ChatRateLimiter();

    @Test
    void allowsEightRequestsPerMinuteThenRejectsWithTooManyRequests() {
        UUID user = UUID.randomUUID();
        for (int i = 0; i < 8; i++) {
            limiter.check(user);
        }

        assertThatThrownBy(() -> limiter.check(user))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode().value()).isEqualTo(429));
    }

    @Test
    void limitsEachUserSeparately() {
        UUID busy = UUID.randomUUID();
        for (int i = 0; i < 8; i++) {
            limiter.check(busy);
        }

        assertThatCode(() -> limiter.check(UUID.randomUUID())).doesNotThrowAnyException();
    }
}
