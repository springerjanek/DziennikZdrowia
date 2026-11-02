package pl.dziennikzdrowia.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import pl.dziennikzdrowia.medication.UserMedicationRepository;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Tester z data.sql (6 leków, wszystkie typy harmonogramu). Wchodzi się na niego przez
 * POST /api/auth/dev-login albo prawdziwym kontem Google o adresie z DEV_TESTER_EMAIL:
 * przy pierwszym takim logowaniu tester dostaje google_sub tego konta i od tej pory
 * jest zwykłym kontem Google z lekami. Tylko profil "local".
 */
@Profile("local")
@Component
public class DevTesterAccount {

    /** Id testera z data.sql. Po id, nie po google_sub, bo po połączeniu z Google sub się zmienia. */
    public static final UUID TESTER_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");

    private static final Logger log = LoggerFactory.getLogger(DevTesterAccount.class);

    private final UserRepository userRepository;
    private final UserMedicationRepository userMedicationRepository;
    private final String testerEmail;

    public DevTesterAccount(UserRepository userRepository,
                            UserMedicationRepository userMedicationRepository,
                            @Value("${app.dev.tester-email:}") String testerEmail) {
        this.userRepository = userRepository;
        this.userMedicationRepository = userMedicationRepository;
        this.testerEmail = testerEmail.strip();
    }

    public Optional<User> tester() {
        return userRepository.findById(TESTER_ID);
    }

    /**
     * Gdy loguje się konto Google z DEV_TESTER_EMAIL, zwraca testera podpiętego pod to konto.
     * Woła to UserService w tej samej transakcji, przed szukaniem użytkownika po google_sub.
     */
    public Optional<User> claimForGoogle(GoogleIdentity identity) {
        if (testerEmail.isEmpty() || !testerEmail.equalsIgnoreCase(identity.email())) {
            return Optional.empty();
        }
        Optional<User> found = tester();
        if (found.isEmpty()) {
            log.warn("DEV_TESTER_EMAIL={} ustawiony, ale testera nie ma w bazie (data.sql sie nie wykonal?)", testerEmail);
            return Optional.empty();
        }
        User tester = found.get();
        if (identity.sub().equals(tester.getGoogleSub())) {
            return Optional.of(tester);
        }

        // To konto Google mogło się już zalogować wcześniej i dostać własne, puste konto.
        // Zwalniamy mu google_sub (unikalny), ale tylko gdy nie ma leków, żeby nie zgubić niczyich danych.
        Optional<User> previous = userRepository.findByGoogleSub(identity.sub());
        if (previous.isPresent()) {
            User old = previous.get();
            if (userMedicationRepository.existsByUserId(old.getId())) {
                log.warn("Konto Google {} ma juz wlasne leki, wiec nie podpinam go pod testera", testerEmail);
                return Optional.empty();
            }
            old.setGoogleSub("odpiete-" + old.getId());
            userRepository.saveAndFlush(old);
        }

        log.info("Podpinam konto Google {} pod testera z data.sql", testerEmail);
        tester.setGoogleSub(identity.sub());
        return Optional.of(tester);
    }
}
