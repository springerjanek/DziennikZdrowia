package pl.dziennikzdrowia.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pl.dziennikzdrowia.auth.GoogleIdentity;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Przy pierwszym logowaniu tworzy usera, przy kolejnych odświeża dane z Google
     * (e-mail, imię i zdjęcie mogą się zmienić, sub nie).
     */
    @Transactional
    public User signInWithGoogle(GoogleIdentity identity) {
        User user = userRepository.findByGoogleSub(identity.sub())
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
}
