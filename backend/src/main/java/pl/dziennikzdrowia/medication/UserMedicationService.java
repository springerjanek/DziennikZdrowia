package pl.dziennikzdrowia.medication;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.dziennikzdrowia.medication.catalog.MedicationSearchService;
import pl.dziennikzdrowia.medication.catalog.ReimbursementInfo;
import pl.dziennikzdrowia.user.UserRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class UserMedicationService {

    // Harmonogram na dłużej niż ~2 miesiące to za dużo naraz dla jednej odpowiedzi.
    static final int MAX_SCHEDULE_DAYS = 62;

    /** Niespójny harmonogram, np. WEEKDAYS bez dni. Kontroler zamienia to na 400. */
    public static class InvalidMedicationException extends RuntimeException {
        public InvalidMedicationException(String message) {
            super(message);
        }
    }

    /** Lek nie istnieje albo należy do innego użytkownika. */
    public static class MedicationNotFoundException extends RuntimeException {
    }

    private final UserMedicationRepository repository;
    private final UserRepository userRepository;
    private final MedicationSearchService searchService;
    private final ScheduleCalculator scheduleCalculator;

    public UserMedicationService(UserMedicationRepository repository,
                                 UserRepository userRepository,
                                 MedicationSearchService searchService,
                                 ScheduleCalculator scheduleCalculator) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.searchService = searchService;
        this.scheduleCalculator = scheduleCalculator;
    }

    @Transactional(readOnly = true)
    public List<UserMedicationResponse> list(UUID userId) {
        return toResponses(repository.findByUserIdOrderByName(userId));
    }

    @Transactional(readOnly = true)
    public UserMedicationResponse get(UUID userId, UUID id) {
        return toResponses(List.of(find(userId, id))).getFirst();
    }

    @Transactional
    public UserMedicationResponse create(UUID userId, UserMedicationRequest request) {
        validate(request);
        UserMedication medication = new UserMedication();
        medication.setUser(userRepository.getReferenceById(userId));
        apply(medication, request);
        return toResponses(List.of(repository.save(medication))).getFirst();
    }

    @Transactional
    public UserMedicationResponse update(UUID userId, UUID id, UserMedicationRequest request) {
        validate(request);
        UserMedication medication = find(userId, id);
        apply(medication, request);
        return toResponses(List.of(repository.save(medication))).getFirst();
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        repository.delete(find(userId, id));
    }

    @Transactional(readOnly = true)
    public List<ScheduledDose> schedule(UUID userId, LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw new InvalidMedicationException("Data 'to' jest wcześniejsza niż 'from'");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_SCHEDULE_DAYS) {
            throw new InvalidMedicationException("Przedział może mieć najwyżej " + MAX_SCHEDULE_DAYS + " dni");
        }
        return scheduleCalculator.expand(repository.findByUserIdOrderByName(userId), from, to);
    }

    private UserMedication find(UUID userId, UUID id) {
        return repository.findByIdAndUserId(id, userId).orElseThrow(MedicationNotFoundException::new);
    }

    static void validate(UserMedicationRequest request) {
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new InvalidMedicationException("Data zakończenia jest wcześniejsza niż data rozpoczęcia");
        }

        ScheduleType type = getScheduleType(request);

        if (type == ScheduleType.AS_NEEDED) {
            if (request.doses().size() != 1 || request.doses().getFirst().time() != null) {
                throw new InvalidMedicationException("Lek w razie potrzeby ma jedną dawkę bez godziny");
            }
            return;
        }

        Set<LocalTime> times = new HashSet<>();
        for (UserMedicationRequest.Dose dose : request.doses()) {
            if (dose.time() == null) {
                throw new InvalidMedicationException("Każda dawka musi mieć godzinę");
            }
            if (!times.add(dose.time())) {
                throw new InvalidMedicationException("Godzina " + dose.time() + " powtarza się");
            }
        }
    }

    private static ScheduleType getScheduleType(UserMedicationRequest request) {
        ScheduleType type = request.scheduleType();
        boolean hasWeekdays = request.weekdays() != null && !request.weekdays().isEmpty();
        if ((type == ScheduleType.WEEKDAYS) != hasWeekdays) {
            throw new InvalidMedicationException("Dni tygodnia podaje się tylko (i zawsze) dla WEEKDAYS");
        }
        if ((type == ScheduleType.EVERY_N_DAYS) != (request.intervalDays() != null)) {
            throw new InvalidMedicationException("intervalDays podaje się tylko (i zawsze) dla EVERY_N_DAYS");
        }
        if (type != ScheduleType.AS_NEEDED && request.maxDailyDoses() != null) {
            throw new InvalidMedicationException("maxDailyDoses dotyczy tylko AS_NEEDED");
        }
        return type;
    }

    private static void apply(UserMedication medication, UserMedicationRequest request) {
        medication.setGtin(blankToNull(request.gtin()));
        medication.setName(request.name().strip());
        medication.setActiveSubstance(blankToNull(request.activeSubstance()));
        medication.setScheduleType(request.scheduleType());
        medication.setWeekdays(request.weekdays() == null || request.weekdays().isEmpty()
                ? EnumSet.noneOf(DayOfWeek.class)
                : EnumSet.copyOf(request.weekdays()));
        medication.setIntervalDays(request.intervalDays());
        medication.setMaxDailyDoses(request.maxDailyDoses());
        medication.setStartDate(request.startDate());
        medication.setEndDate(request.endDate());
        medication.setNotes(blankToNull(request.notes()));

        List<MedicationDose> doses = new ArrayList<>();
        for (UserMedicationRequest.Dose source : request.doses()) {
            MedicationDose dose = new MedicationDose();
            dose.setTime(source.time());
            dose.setAmount(source.amount());
            dose.setUnit(source.unit());
            dose.setInstruction(blankToNull(source.instruction()));
            doses.add(dose);
        }
        doses.sort(Comparator.comparing(MedicationDose::getTime, Comparator.nullsFirst(Comparator.naturalOrder())));
        medication.replaceDoses(doses);
    }

    private List<UserMedicationResponse> toResponses(List<UserMedication> medications) {
        List<String> gtins = medications.stream()
                .map(UserMedication::getGtin)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<String, ReimbursementInfo> reimbursements = searchService.reimbursements(gtins);
        ReimbursementInfo fullPrice = searchService.fullPrice();

        return medications.stream()
                .map(medication -> UserMedicationResponse.from(medication,
                        medication.getGtin() == null
                                ? fullPrice
                                : reimbursements.getOrDefault(medication.getGtin(), fullPrice)))
                .toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
