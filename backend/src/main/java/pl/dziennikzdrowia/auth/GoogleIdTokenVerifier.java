package pl.dziennikzdrowia.auth;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;

/**
 * Sprawdza ID token, który front dostaje z Google Identity Services.
 * Podpis, iss, aud i exp weryfikuje dekoder z {@link GoogleAuthConfig}.
 */
@Component
public class GoogleIdTokenVerifier {

    private final JwtDecoder decoder;

    public GoogleIdTokenVerifier(@Qualifier("googleIdTokenDecoder") JwtDecoder decoder) {
        this.decoder = decoder;
    }

    public GoogleIdentity verify(String idToken) {
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException e) {
            throw new InvalidGoogleTokenException("Nieprawidłowy token Google", e);
        }

        String email = jwt.getClaimAsString("email");
        if (email == null || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
            throw new InvalidGoogleTokenException("Konto Google nie ma zweryfikowanego e-maila");
        }

        return new GoogleIdentity(
                jwt.getSubject(),
                email,
                jwt.getClaimAsString("name"),
                jwt.getClaimAsString("picture"));
    }
}
