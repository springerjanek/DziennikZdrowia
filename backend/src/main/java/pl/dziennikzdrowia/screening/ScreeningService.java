package pl.dziennikzdrowia.screening;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserRepository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;
import java.util.UUID;

@Service
public class ScreeningService {

    // Najpierw bezplatne programy NFZ, potem zalecenia - jak w evaluate() na froncie.
    private static final Comparator<ScreeningRule> RULE_ORDER =
            Comparator.comparing(ScreeningRule::getSource).thenComparing(ScreeningRule::getLabel);

    private final ScreeningRuleRepository ruleRepository;
    private final UserScreeningRepository screeningRepository;
    private final UserRepository userRepository;

    public ScreeningService(ScreeningRuleRepository ruleRepository,
                            UserScreeningRepository screeningRepository,
                            UserRepository userRepository) {
        this.ruleRepository = ruleRepository;
        this.screeningRepository = screeningRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<ScreeningRuleResponse> rules() {
        return ruleRepository.findByActiveTrue().stream()
                .sorted(RULE_ORDER)
                .map(ScreeningRuleResponse::from)
                .toList();
    }

    /**
     * Badania, ktore dotycza uzytkownika teraz, z ostatnim wykonaniem i nastepnym terminem.
     * 409, gdy profil (rok/miesiac urodzenia, plec) nie jest wypelniony - front kieruje wtedy do onboardingu.
     */
    @Transactional(readOnly = true)
    public List<DueScreeningResponse> dueScreenings(UUID userId, LocalDate today) {
        User user = findUser(userId);
        if (!user.hasProfile()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Profil nie jest wypelniony");
        }
        HealthProfile profile = HealthProfile.from(user);

        // Historia jest posortowana od najnowszych, wiec pierwszy wpis danej reguly = ostatnie wykonanie.
        Map<String, LocalDate> lastPerformed = new HashMap<>();
        for (UserScreening screening : screeningRepository.findByUserIdOrderByPerformedOnDesc(userId)) {
            lastPerformed.putIfAbsent(screening.getRule().getId(), screening.getPerformedOn());
        }

        List<DueScreeningResponse> result = new ArrayList<>();
        for (ScreeningRule rule : ruleRepository.findByActiveTrue().stream().sorted(RULE_ORDER).toList()) {
            if (!ScreeningEvaluator.isEligible(rule, profile, today)) {
                continue;
            }
            OptionalInt interval = ScreeningEvaluator.intervalMonths(rule, profile.ageFor(rule.getAgeBasis(), today));
            if (interval.isEmpty()) {
                continue;
            }
            result.add(toDue(rule, interval.getAsInt(), lastPerformed.get(rule.getId()), today));
        }
        return result;
    }

    static DueScreeningResponse toDue(ScreeningRule rule, int intervalMonths, LocalDate last, LocalDate today) {
        LocalDate nextDue = last == null ? null : last.plusMonths(intervalMonths);
        ScreeningStatus status;
        if (last == null) {
            status = ScreeningStatus.NEVER_DONE;
        } else if (!nextDue.isAfter(today)) {
            status = ScreeningStatus.DUE;
        } else {
            status = ScreeningStatus.UPCOMING;
        }
        return new DueScreeningResponse(rule.getId(), rule.getLabel(), rule.getRationale(), rule.getSource(),
                rule.getNfzBenefit(), intervalMonths, last, nextDue, status);
    }

    @Transactional(readOnly = true)
    public List<UserScreeningResponse> history(UUID userId) {
        return screeningRepository.findByUserIdOrderByPerformedOnDesc(userId).stream()
                .map(UserScreeningResponse::from)
                .toList();
    }

    /**
     * Zapisuje wykonane badanie. Nie sprawdzamy, czy regula dotyczy uzytkownika -
     * badanie zrobione poza programem (np. mammografia w wieku 40 lat) tez jest wazna informacja.
     */
    @Transactional
    public UserScreeningResponse record(UUID userId, UserScreeningRequest request, LocalDate today) {
        if (request.performedOn().isAfter(today)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data badania z przyszlosci");
        }
        ScreeningRule rule = ruleRepository.findById(request.ruleId())
                .filter(ScreeningRule::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieznane badanie"));

        UserScreening screening = new UserScreening();
        screening.setUser(findUser(userId));
        screening.setRule(rule);
        screening.setPerformedOn(request.performedOn());
        screening.setNotes(request.notes());
        return UserScreeningResponse.from(screeningRepository.save(screening));
    }

    /**
     * Usuwa wpis z historii (np. pomylka). Cudzy wpis traktujemy jak nieistniejacy - 404, nie 403,
     * zeby nie zdradzac, ze takie id istnieje.
     */
    @Transactional
    public void delete(UUID userId, UUID screeningId) {
        UserScreening screening = screeningRepository.findByIdAndUserId(screeningId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        screeningRepository.delete(screening);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                // Sesja jest, ale usera usunieto z bazy.
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
