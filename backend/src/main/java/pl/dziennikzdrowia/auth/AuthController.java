package pl.dziennikzdrowia.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserResponse;
import pl.dziennikzdrowia.user.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    private final UserService userService;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextHolderStrategy securityContextHolderStrategy =
            SecurityContextHolder.getContextHolderStrategy();

    public AuthController(GoogleIdTokenVerifier googleIdTokenVerifier,
                          UserService userService,
                          SecurityContextRepository securityContextRepository,
                          CsrfTokenRepository csrfTokenRepository) {
        this.googleIdTokenVerifier = googleIdTokenVerifier;
        this.userService = userService;
        this.securityContextRepository = securityContextRepository;
        // Po zalogowaniu nowe id sesji (session fixation) i nowy token CSRF.
        this.sessionAuthenticationStrategy = new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrfTokenRepository)));
    }

    public record GoogleSignInRequest(@NotBlank String credential) {
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

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                user.getId(), null, AuthorityUtils.createAuthorityList("ROLE_USER"));

        request.getSession(true);
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);

        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);

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
