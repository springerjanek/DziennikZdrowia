package pl.dziennikzdrowia.user;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pl.dziennikzdrowia.auth.DevTesterAccount;
import pl.dziennikzdrowia.auth.GoogleIdentity;

import java.time.YearMonth;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    // Jest tylko z profilem "local"; na produkcji pusty.
    private final ObjectProvider<DevTesterAccount> devTesterAccount;

    public UserService(UserRepository userRepository, ObjectProvider<DevTesterAccount> devTesterAccount) {
        this.userRepository = userRepository;
        this.devTesterAccount = devTesterAccount;
    }

    /**
     * Przy pierwszym logowaniu tworzy usera, przy kolejnych odświeża dane z Google
     * (e-mail, imię i zdjęcie mogą się zmienić, sub nie).
     */
    @Transactional
    public User signInWithGoogle(GoogleIdentity identity) {
        User user = devTester(identity)
                .or(() -> userRepository.findByGoogleSub(identity.sub()))
                .orElseGet(() -> {
                    User created = new User();
                    created.setGoogleSub(identity.sub());
                    return created;
                });

        user.setEmail(identity.email());
        user.setName(identity.name());
        user.setPictureUrl(identity.pictureUrl());
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(UUID userId) {
        return UserProfileResponse.from(findUser(userId));
    }

    /**
     * Zapisuje profil z onboardingu (nadpisuje caly - PUT).
     */
    @Transactional
    public UserProfileResponse updateProfile(UUID userId, UserProfileRequest request, YearMonth now) {
        YearMonth birth = YearMonth.of(request.birthYear(), request.birthMonth());
        if (birth.isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data urodzenia z przyszlosci");
        }
        for (String condition : request.conditions()) {
            if (!ChronicConditions.IDS.contains(condition)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nieznana choroba: " + condition);
            }
        }

        User user = findUser(userId);
        user.setBirthYear(request.birthYear());
        user.setBirthMonth(request.birthMonth());
        user.setSex(request.sex());
        // Podmieniamy zawartosc, a nie kolekcje - Hibernate sledzi konkretna instancje.
        user.getConditions().clear();
        user.getConditions().addAll(request.conditions());
        return UserProfileResponse.from(user);
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                // Sesja jest, ale usera usunieto z bazy.
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private Optional<User> devTester(GoogleIdentity identity) {
        DevTesterAccount account = devTesterAccount.getIfAvailable();
        return account == null ? Optional.empty() : account.claimForGoogle(identity);
    }
}
