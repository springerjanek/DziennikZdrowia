package pl.dziennikzdrowia.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Component;
import pl.dziennikzdrowia.user.User;

import java.util.List;

/**
 * Zakłada sesję (ciasteczko HttpOnly) dla zalogowanego użytkownika. Wspólne dla logowania przez Google
 * i logowania testera w dev, żeby obie ścieżki dawały dokładnie taką samą sesję i token CSRF.
 */
@Component
public class SessionSignIn {

    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;
    private final SecurityContextHolderStrategy securityContextHolderStrategy =
            SecurityContextHolder.getContextHolderStrategy();

    public SessionSignIn(SecurityContextRepository securityContextRepository,
                         CsrfTokenRepository csrfTokenRepository) {
        this.securityContextRepository = securityContextRepository;
        // Po zalogowaniu nowe id sesji (session fixation) i nowy token CSRF.
        this.sessionAuthenticationStrategy = new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrfTokenRepository)));
    }

    public void signIn(User user, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
                user.getId(), null, AuthorityUtils.createAuthorityList("ROLE_USER"));

        request.getSession(true);
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);

        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
