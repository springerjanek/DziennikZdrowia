package pl.dziennikzdrowia.chat;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class ChatService {

    // Prompt systemowy: to on pilnuje, żeby bot nie udawał lekarza.
    static final String SYSTEM_PROMPT = """
            Jesteś asystentem w aplikacji "Dziennik Zdrowia", która pomaga polskim użytkownikom \
            w profilaktyce zdrowotnej (badania przesiewowe, leki, wizyty).
            Zasady:
            - Odpowiadaj po polsku, prosto i krótko (maksymalnie kilka zdań).
            - Podajesz informacje ogólne i edukacyjne. Nie stawiasz diagnoz, nie zalecasz leczenia \
            ani zmiany dawek leków. W takich sprawach odsyłasz do lekarza lub farmaceuty.
            - Jeśli ktoś opisuje objawy zagrażające życiu (ból w klatce piersiowej, duszność, \
            utrata przytomności, objawy udaru, silne krwawienie, myśli samobójcze), od razu każ \
            zadzwonić pod numer 112.
            - Jeśli pytanie nie dotyczy zdrowia ani aplikacji, grzecznie odmów.
            - Gdy nie jesteś pewien odpowiedzi, powiedz to wprost.
            """;

    private final GeminiClient geminiClient;
    private final ChatRateLimiter rateLimiter;

    public ChatService(GeminiClient geminiClient, ChatRateLimiter rateLimiter) {
        this.geminiClient = geminiClient;
        this.rateLimiter = rateLimiter;
    }

    public String reply(UUID userId, List<ChatMessage> messages) {
        if (!"user".equals(messages.get(messages.size() - 1).role())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ostatnia wiadomość musi pochodzić od użytkownika");
        }
        rateLimiter.check(userId);
        return geminiClient.generate(SYSTEM_PROMPT, messages);
    }
}
