package pl.dziennikzdrowia.screening;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import pl.dziennikzdrowia.config.AppTime;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ScreeningController {

    private final ScreeningService screeningService;

    public ScreeningController(ScreeningService screeningService) {
        this.screeningService = screeningService;
    }

    /** Caly katalog aktywnych regul. */
    @GetMapping("/screening/rules")
    public List<ScreeningRuleResponse> rules() {
        return screeningService.rules();
    }

    /** Badania nalezne zalogowanemu uzytkownikowi z terminami. */
    @GetMapping("/me/screenings")
    public List<DueScreeningResponse> due(@AuthenticationPrincipal UUID userId) {
        return screeningService.dueScreenings(userId, today());
    }

    /** Historia wykonanych badan, najnowsze pierwsze. */
    @GetMapping("/me/screenings/history")
    public List<UserScreeningResponse> history(@AuthenticationPrincipal UUID userId) {
        return screeningService.history(userId);
    }

    @PostMapping("/me/screenings")
    @ResponseStatus(HttpStatus.CREATED)
    public UserScreeningResponse record(@AuthenticationPrincipal UUID userId,
                                        @Valid @RequestBody UserScreeningRequest request) {
        return screeningService.record(userId, request, today());
    }

    @DeleteMapping("/me/screenings/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        screeningService.delete(userId, id);
    }

    private static LocalDate today() {
        return LocalDate.now(AppTime.ZONE);
    }
}
