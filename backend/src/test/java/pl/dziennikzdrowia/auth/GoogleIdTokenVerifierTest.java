package pl.dziennikzdrowia.auth;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleIdTokenVerifierTest {

    private static final String CLIENT_ID = "test-client-id.apps.googleusercontent.com";

    private static KeyPair googleKeys;
    private static KeyPair otherKeys;
    private static GoogleIdTokenVerifier verifier;

    @BeforeAll
    static void setUp() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        googleKeys = generator.generateKeyPair();
        otherKeys = generator.generateKeyPair();

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) googleKeys.getPublic()).build();
        decoder.setJwtValidator(GoogleAuthConfig.googleIdTokenValidator(CLIENT_ID));
        verifier = new GoogleIdTokenVerifier(decoder);
    }

    @Test
    void acceptsValidToken() throws Exception {
        GoogleIdentity identity = verifier.verify(token(googleKeys, UnaryOperator.identity()));

        assertThat(identity.sub()).isEqualTo("1234567890");
        assertThat(identity.email()).isEqualTo("ania@example.com");
        assertThat(identity.name()).isEqualTo("Ania");
        assertThat(identity.pictureUrl()).isEqualTo("https://example.com/a.png");
    }

    @Test
    void acceptsIssuerWithoutScheme() throws Exception {
        String token = token(googleKeys, c -> c.issuer("accounts.google.com"));

        assertThat(verifier.verify(token).sub()).isEqualTo("1234567890");
    }

    @Test
    void rejectsTokenSignedWithOtherKey() throws Exception {
        String token = token(otherKeys, UnaryOperator.identity());

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejectsTokenForOtherClient() throws Exception {
        String token = token(googleKeys, c -> c.audience("someone-else.apps.googleusercontent.com"));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejectsOtherIssuer() throws Exception {
        String token = token(googleKeys, c -> c.issuer("https://evil.example.com"));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejectsExpiredToken() throws Exception {
        String token = token(googleKeys, c -> c.expirationTime(Date.from(Instant.now().minusSeconds(3600))));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejectsUnverifiedEmail() throws Exception {
        String token = token(googleKeys, c -> c.claim("email_verified", false));

        assertThatThrownBy(() -> verifier.verify(token)).isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void rejectsGarbage() {
        assertThatThrownBy(() -> verifier.verify("nie-jwt")).isInstanceOf(InvalidGoogleTokenException.class);
    }

    private static String token(KeyPair keys, UnaryOperator<JWTClaimsSet.Builder> customize) throws Exception {
        Instant now = Instant.now();
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer("https://accounts.google.com")
                .audience(CLIENT_ID)
                .subject("1234567890")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)))
                .claim("email", "ania@example.com")
                .claim("email_verified", true)
                .claim("name", "Ania")
                .claim("picture", "https://example.com/a.png");

        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), customize.apply(claims).build());
        jwt.sign(new RSASSASigner(keys.getPrivate()));
        return jwt.serialize();
    }
}
