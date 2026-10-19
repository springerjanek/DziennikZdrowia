package pl.dziennikzdrowia.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.Collection;
import java.util.Set;

@Configuration
public class GoogleAuthConfig {

    // Klucze publiczne Google; Nimbus cache'uje je i odświeża przy rotacji.
    private static final String GOOGLE_JWK_SET_URI = "https://www.googleapis.com/oauth2/v3/certs";

    // Google podaje iss w jednej z dwóch postaci.
    private static final Set<String> GOOGLE_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    @Bean
    JwtDecoder googleIdTokenDecoder(@Value("${app.google.client-id}") String clientId) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(GOOGLE_JWK_SET_URI).build();
        decoder.setJwtValidator(googleIdTokenValidator(clientId));
        return decoder;
    }

    /** exp/nbf (domyślne walidatory) + iss od Google + aud równe naszemu Client ID. */
    static OAuth2TokenValidator<Jwt> googleIdTokenValidator(String clientId) {
        return JwtValidators.createDefaultWithValidators(
                new JwtClaimValidator<Object>(JwtClaimNames.ISS,
                        iss -> iss != null && GOOGLE_ISSUERS.contains(iss.toString())),
                // Token musi być wydany dla naszej aplikacji, a nie dowolnej innej używającej Google.
                new JwtClaimValidator<Collection<String>>(JwtClaimNames.AUD,
                        aud -> aud != null && !clientId.isBlank() && aud.contains(clientId)));
    }
}
