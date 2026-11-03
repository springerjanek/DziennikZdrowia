package pl.dziennikzdrowia.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserResponse;
import pl.dziennikzdrowia.user.UserService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final UserService userService;
    private final SessionSignIn sessionSignIn;

    public AuthController(GoogleIdTokenVerifier googleIdTokenVerifier,
                          UserService userService,
                          SessionSignIn sessionSignIn) {
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.userService = userService;
        this.sessionSignIn = sessionSignIn;
    }

    /**
     * Front wysyła tu ID token z Google Identity Services. Po weryfikacji
     * zakładamy sesję (ciasteczko HttpOnly); token Google nie jest nigdzie zapisywany.
     */
    @PostMapping("/google")
    public UserResponse signInWithGoogle(@Valid @RequestBody GoogleSignInRequest body,
                                         HttpServletRequest request,
                                         HttpServletResponse response) {
        GoogleIdentity identity = googleIdTokenVerifier.verify(body.credential());
        User user = userService.signInWithGoogle(identity);
        sessionSignIn.signIn(user, request, response);
        return UserResponse.from(user);
    }

    /**
     * Ustawia ciasteczko XSRF-TOKEN. Front woła to przed pierwszym POST-em,
     * jeśli jeszcze go nie ma.
     */
    @GetMapping("/csrf")
    public ResponseEntity<Void> csrf(CsrfToken csrfToken) {
        csrfToken.getToken();
        return ResponseEntity.noContent().build();
    }
}
