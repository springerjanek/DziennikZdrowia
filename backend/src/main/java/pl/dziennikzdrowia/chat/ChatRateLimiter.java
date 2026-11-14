package pl.dziennikzdrowia.chat;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Prosty limit zapytań na użytkownika (w pamięci, znika po restarcie): chroni darmowy limit Gemini
 * i koszty. Przy kilku instancjach backendu trzeba by go przenieść do bazy.
 */
@Component
public class ChatRateLimiter {

    private static final int PER_MINUTE = 8;
    private static final int PER_DAY = 100;

    private final Map<UUID, Deque<Instant>> requests = new ConcurrentHashMap<>();

    /** Zalicza zapytanie albo rzuca 429. */
    public void check(UUID userId) {
        Instant now = Instant.now();
        Deque<Instant> times = requests.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (times) {
            Instant dayAgo = now.minus(Duration.ofDays(1));
            while (!times.isEmpty() && times.peekFirst().isBefore(dayAgo)) {
                times.pollFirst();
            }
            Instant minuteAgo = now.minus(Duration.ofMinutes(1));
            long lastMinute = times.stream().filter(t -> t.isAfter(minuteAgo)).count();
            if (lastMinute >= PER_MINUTE || times.size() >= PER_DAY) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Za dużo pytań do asystenta. Spróbuj za chwilę.");
            }
            times.addLast(now);
        }
    }
}
