package pl.dziennikzdrowia.user;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.dziennikzdrowia.auth.DevTesterAccount;
import pl.dziennikzdrowia.auth.GoogleIdentity;

import java.util.Optional;

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

    private Optional<User> devTester(GoogleIdentity identity) {
        DevTesterAccount account = devTesterAccount.getIfAvailable();
        return account == null ? Optional.empty() : account.claimForGoogle(identity);
    }
}
