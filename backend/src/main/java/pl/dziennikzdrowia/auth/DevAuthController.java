package pl.dziennikzdrowia.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserResponse;

/**
 * Logowanie na skróty jako tester z data.sql, bez Google. Istnieje tylko z profilem "local"
 * (SPRING_PROFILES_ACTIVE=local); bez niego POST /api/auth/dev-login zwraca 404.
 * Ten sam profil włącza data.sql (application-local.yml), więc tester zawsze jest w bazie.
 */
@Profile("local")
@RestController
@RequestMapping("/api/auth")
public class DevAuthController {

    private final DevTesterAccount devTesterAccount;
    private final SessionSignIn sessionSignIn;

    public DevAuthController(DevTesterAccount devTesterAccount, SessionSignIn sessionSignIn) {
        this.devTesterAccount = devTesterAccount;
        this.sessionSignIn = sessionSignIn;
    }

    /** Zwraca to samo co POST /api/auth/google i zakłada taką samą sesję. */
    @PostMapping("/dev-login")
    public UserResponse signInAsTester(HttpServletRequest request, HttpServletResponse response) {
        User tester = devTesterAccount.tester()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                        "Brak testera w bazie - data.sql sie nie wykonal?"));
        sessionSignIn.signIn(tester, request, response);
        return UserResponse.from(tester);
    }
}
