package pl.dziennikzdrowia.auth;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import pl.dziennikzdrowia.user.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Przechodzi ten sam przepływ co front: GET /api/auth/csrf, potem POST z nagłówkiem X-XSRF-TOKEN.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    private static final String BODY = "{\"credential\":\"google-id-token\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private GoogleIdTokenVerifier googleIdTokenVerifier;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        when(googleIdTokenVerifier.verify("google-id-token"))
                .thenReturn(new GoogleIdentity("sub-1", "ania@example.com", "Ania", null));
        when(googleIdTokenVerifier.verify("bad-token"))
                .thenThrow(new InvalidGoogleTokenException("zly token"));
    }

    @Test
    void meWithoutSessionReturns401() throws Exception {
        mockMvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void signInCreatesUserAndSession() throws Exception {
        MockHttpSession session = signIn();

        assertThat(userRepository.findByGoogleSub("sub-1")).isPresent();

        mockMvc.perform(get("/api/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ania@example.com"))
                .andExpect(jsonPath("$.name").value("Ania"));
    }

    @Test
    void secondSignInReusesUser() throws Exception {
        signIn();
        signIn();

        assertThat(userRepository.count()).isEqualTo(1);
    }

    @Test
    void invalidTokenReturns401() throws Exception {
        mockMvc.perform(withCsrf(post("/api/auth/google"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"bad-token\"}"))
                .andExpect(status().isUnauthorized());

        assertThat(userRepository.count()).isZero();
    }

    @Test
    void signInWithoutCsrfIsRejected() throws Exception {
        mockMvc.perform(post("/api/auth/google")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
    }

    @Test
    void logoutEndsSession() throws Exception {
        MockHttpSession session = signIn();

        mockMvc.perform(withCsrf(post("/api/auth/logout")).session(session))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/me").session(session)).andExpect(status().isUnauthorized());
    }

    private MockHttpSession signIn() throws Exception {
        return (MockHttpSession) mockMvc.perform(withCsrf(post("/api/auth/google"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn().getRequest().getSession(false);
    }

    private MockHttpServletRequestBuilder withCsrf(MockHttpServletRequestBuilder request) throws Exception {
        String token = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isNoContent())
                .andReturn().getResponse().getHeaders("Set-Cookie").stream()
                .filter(header -> header.startsWith("XSRF-TOKEN="))
                .map(header -> header.substring("XSRF-TOKEN=".length(), header.indexOf(';')))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Brak ciasteczka XSRF-TOKEN"));

        return request.cookie(new Cookie("XSRF-TOKEN", token)).header("X-XSRF-TOKEN", token);
    }
}
