package pl.dziennikzdrowia.auth;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import pl.dziennikzdrowia.medication.UserMedicationRepository;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Profil "local" włącza też data.sql, ale ten skrypt jest pod PostgreSQL, a testy działają na H2,
 * więc go wyłączamy i testera wstawiamy sami (tym samym stałym id co data.sql).
 */
@SpringBootTest(properties = {
        "spring.sql.init.mode=never",
        "app.dev.tester-email=tester@gmail.com"})
@AutoConfigureMockMvc
@ActiveProfiles({"test", "local"})
class DevAuthControllerTest {

    private static final String TESTER_ID = DevTesterAccount.TESTER_ID.toString();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserMedicationRepository userMedicationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private GoogleIdTokenVerifier googleIdTokenVerifier;

    @BeforeEach
    void setUp() {
        userMedicationRepository.deleteAll();
        userRepository.deleteAll();
        when(googleIdTokenVerifier.verify("tester-token"))
                .thenReturn(new GoogleIdentity("real-sub", "Tester@gmail.com", "Natalia", null));
        when(googleIdTokenVerifier.verify("other-token"))
                .thenReturn(new GoogleIdentity("other-sub", "other@gmail.com", "Ktos", null));
    }

    @Test
    void devLoginSignsInAsTesterWithSessionAndNewCsrfToken() throws Exception {
        insertTester();

        // Tak samo jak przy logowaniu przez Google: UserResponse w odpowiedzi i nowy token CSRF.
        MvcResult result = mockMvc.perform(withCsrf(post("/api/auth/dev-login")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(TESTER_ID))
                .andExpect(jsonPath("$.email").value("jan@example.com"))
                .andReturn();
        assertThat(result.getResponse().getHeaders("Set-Cookie"))
                .anyMatch(header -> header.startsWith("XSRF-TOKEN="));

        Cookie session = result.getResponse().getCookie("SESSION");
        mockMvc.perform(get("/api/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("jan@example.com"));
        mockMvc.perform(get("/api/me/medications").cookie(session))
                .andExpect(status().isOk());
    }

    @Test
    void devLoginReportsMissingTester() throws Exception {
        mockMvc.perform(withCsrf(post("/api/auth/dev-login")))
                .andExpect(status().isConflict());
    }

    @Test
    void devLoginRequiresCsrfLikeGoogleSignIn() throws Exception {
        mockMvc.perform(post("/api/auth/dev-login")).andExpect(status().isForbidden());
    }

    @Test
    void googleAccountFromDevTesterEmailGetsTesterAccount() throws Exception {
        insertTester();

        googleSignIn("tester-token").andExpect(jsonPath("$.id").value(TESTER_ID));
        // Kolejne logowania trafiają na testera już zwyczajnie, po google_sub.
        googleSignIn("tester-token").andExpect(jsonPath("$.id").value(TESTER_ID));

        User tester = userRepository.findById(DevTesterAccount.TESTER_ID).orElseThrow();
        assertThat(tester.getGoogleSub()).isEqualTo("real-sub");
        assertThat(tester.getName()).isEqualTo("Natalia");
        assertThat(userRepository.count()).isEqualTo(1);
        // dev-login dalej działa, choć tester ma już prawdziwy google_sub.
        mockMvc.perform(withCsrf(post("/api/auth/dev-login")))
                .andExpect(jsonPath("$.id").value(TESTER_ID));
    }

    @Test
    void detachesEarlierEmptyAccountOfTheSameGoogleUser() throws Exception {
        insertTester();
        // Ktoś zalogował się tym kontem, zanim ustawił DEV_TESTER_EMAIL, i dostał puste konto.
        User earlier = new User();
        earlier.setGoogleSub("real-sub");
        earlier.setEmail("tester@gmail.com");
        earlier = userRepository.save(earlier);

        googleSignIn("tester-token").andExpect(jsonPath("$.id").value(TESTER_ID));

        assertThat(userRepository.findById(earlier.getId()).orElseThrow().getGoogleSub())
                .isEqualTo("odpiete-" + earlier.getId());
    }

    @Test
    void otherGoogleAccountsGetTheirOwnAccount() throws Exception {
        insertTester();

        googleSignIn("other-token").andExpect(jsonPath("$.id").value(org.hamcrest.Matchers.not(TESTER_ID)));

        assertThat(userRepository.findById(DevTesterAccount.TESTER_ID).orElseThrow().getGoogleSub())
                .isEqualTo("seed-jan");
    }

    private void insertTester() {
        jdbcTemplate.update("insert into users (id, google_sub, email, name) values (?, 'seed-jan', 'jan@example.com', 'Jan Testowy')",
                DevTesterAccount.TESTER_ID);
    }

    private org.springframework.test.web.servlet.ResultActions googleSignIn(String credential) throws Exception {
        return mockMvc.perform(withCsrf(post("/api/auth/google"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"" + credential + "\"}"))
                .andExpect(status().isOk());
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
