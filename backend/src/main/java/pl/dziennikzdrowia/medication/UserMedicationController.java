package pl.dziennikzdrowia.medication;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/medications")
public class UserMedicationController {

    private final UserMedicationService service;

    public UserMedicationController(UserMedicationService service) {
        this.service = service;
    }

    @GetMapping
    public List<UserMedicationResponse> list(@AuthenticationPrincipal UUID userId) {
        return service.list(userId);
    }

    @GetMapping("/{id}")
    public UserMedicationResponse get(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return service.get(userId, id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserMedicationResponse create(@AuthenticationPrincipal UUID userId,
                                         @Valid @RequestBody UserMedicationRequest request) {
        return service.create(userId, request);
    }

    @PutMapping("/{id}")
    public UserMedicationResponse update(@AuthenticationPrincipal UUID userId,
                                         @PathVariable UUID id,
                                         @Valid @RequestBody UserMedicationRequest request) {
        return service.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
        return ResponseEntity.noContent().build();
    }

    /** Dawki do przyjęcia od {@code from} do {@code to} włącznie, np. plan na dziś albo na tydzień. */
    @GetMapping("/schedule")
    public List<ScheduledDose> schedule(@AuthenticationPrincipal UUID userId,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.schedule(userId, from, to);
    }

    // Komunikat trafia do frontu w polu "detail", żeby dało się go pokazać przy formularzu.
    @ExceptionHandler(UserMedicationService.InvalidMedicationException.class)
    ProblemDetail invalidMedication(UserMedicationService.InvalidMedicationException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(UserMedicationService.MedicationNotFoundException.class)
    ProblemDetail notFound() {
        return ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
    }
}
