package pl.dziennikzdrowia.chat;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Wymaga logowania (SecurityConfig: anyRequest().authenticated()), bo każde zapytanie kosztuje. */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chat(@AuthenticationPrincipal UUID userId,
                             @Valid @RequestBody ChatRequest request) {
        return new ChatResponse(chatService.reply(userId, request.messages()));
    }
}
