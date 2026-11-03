package pl.dziennikzdrowia.medication;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;
import pl.dziennikzdrowia.auth.GoogleIdTokenVerifier;
import pl.dziennikzdrowia.auth.GoogleIdentity;
import pl.dziennikzdrowia.medication.catalog.CatalogMedication;
import pl.dziennikzdrowia.medication.catalog.CatalogMedicationRepository;
import pl.dziennikzdrowia.medication.catalog.NfzDictionaryClient;
import pl.dziennikzdrowia.medication.catalog.ReimbursementLevel;
import pl.dziennikzdrowia.user.UserRepository;

import java.time.LocalDate;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserMedicationControllerTest {

    private static final String METFORMAX_GTIN = "05909990000001";

    private static final String DAILY_TWICE = """
            {
              "gtin": "05909990000001",
              "name": "Metformax 500",
              "activeSubstance": "Metforminum",
              "scheduleType": "DAILY",
              "startDate": "2026-10-19",
              "doses": [
                {"time": "20:00", "amount": 0.5, "unit": "TABLET"},
                {"time": "08:00", "amount": 1, "unit": "TABLET", "instruction": "po posiłku"}
              ]
            }""";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserMedicationRepository userMedicationRepository;

    @Autowired
    private CatalogMedicationRepository catalogRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @MockitoBean
    private GoogleIdTokenVerifier googleIdTokenVerifier;

    @MockitoBean
    private NfzDictionaryClient nfzDictionaryClient;

    @BeforeEach
    void setUp() {
        cleanUp();
        CatalogMedication metformax = new CatalogMedication();
        metformax.setGtin(METFORMAX_GTIN);
        metformax.setName("Metformax 500, tabl., 500 mg");
        metformax.setLevel(ReimbursementLevel.FLAT_RATE);
        metformax.setAnnouncementDate(LocalDate.of(2026, 10, 1));
        catalogRepository.save(metformax);

        when(googleIdTokenVerifier.verify("ania")).thenReturn(new GoogleIdentity("sub-ania", "ania@example.com", "Ania", null));
        when(googleIdTokenVerifier.verify("ola")).thenReturn(new GoogleIdentity("sub-ola", "ola@example.com", "Ola", null));
    }

    // Inne testy kasują userów, a leki trzymają do nich klucz obcy.
    @AfterEach
    void cleanUp() {
        userMedicationRepository.deleteAll();
        userRepository.deleteAll();
        transactionTemplate.executeWithoutResult(status -> catalogRepository.deleteAllInBatch());
    }

    @Test
    void requiresSignIn() throws Exception {
        mockMvc.perform(get("/api/me/medications")).andExpect(status().isUnauthorized());
    }

    @Test
    void medicationSearchWorksWithoutSignIn() throws Exception {
        mockMvc.perform(get("/api/medications/search").param("q", "metformax"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ean").value(METFORMAX_GTIN))
                .andExpect(jsonPath("$[0].reimbursement.level").value("flat_rate"));
    }

    @Test
    void createsMedicationWithSortedDosesAndCurrentReimbursement() throws Exception {
        Cookie session = signIn("ania");

        mockMvc.perform(withCsrf(post("/api/me/medications")).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content(DAILY_TWICE))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.doses[0].time").value("08:00:00"))
                .andExpect(jsonPath("$.doses[0].instruction").value("po posiłku"))
                .andExpect(jsonPath("$.doses[1].amount").value(0.5))
                .andExpect(jsonPath("$.reimbursement.level").value("flat_rate"));

        mockMvc.perform(get("/api/me/medications").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Metformax 500"));
    }

    @Test
    void medicationWithoutGtinIsFullPrice() throws Exception {
        Cookie session = signIn("ania");

        mockMvc.perform(withCsrf(post("/api/me/medications")).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Ibuprom", "scheduleType": "AS_NEEDED", "maxDailyDoses": 3,
                                 "startDate": "2026-10-19", "doses": [{"amount": 1, "unit": "TABLET"}]}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reimbursement.level").value("full"));
    }

    @Test
    void scheduleExpandsDosesForRange() throws Exception {
        Cookie session = signIn("ania");
        create(session, DAILY_TWICE);

        mockMvc.perform(get("/api/me/medications/schedule").cookie(session)
                        .param("from", "2026-10-20").param("to", "2026-10-21"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].date").value("2026-10-20"))
                .andExpect(jsonPath("$[0].time").value("08:00:00"))
                .andExpect(jsonPath("$[0].medicationName").value("Metformax 500"));
    }

    @Test
    void scheduleRejectsTooLongRange() throws Exception {
        Cookie session = signIn("ania");

        mockMvc.perform(get("/api/me/medications/schedule").cookie(session)
                        .param("from", "2026-01-01").param("to", "2026-12-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void rejectsWeekdaysScheduleWithoutDays() throws Exception {
        Cookie session = signIn("ania");

        mockMvc.perform(withCsrf(post("/api/me/medications")).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(DAILY_TWICE.replace("\"DAILY\"", "\"WEEKDAYS\"")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Dni tygodnia podaje się tylko (i zawsze) dla WEEKDAYS"));
    }

    @Test
    void rejectsDuplicateTimes() throws Exception {
        Cookie session = signIn("ania");

        mockMvc.perform(withCsrf(post("/api/me/medications")).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(DAILY_TWICE.replace("20:00", "08:00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMissingFields() throws Exception {
        Cookie session = signIn("ania");

        mockMvc.perform(withCsrf(post("/api/me/medications")).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"\", \"scheduleType\": \"DAILY\", \"doses\": []}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void updatesScheduleToWeekdays() throws Exception {
        Cookie session = signIn("ania");
        String id = create(session, DAILY_TWICE);

        mockMvc.perform(withCsrf(put("/api/me/medications/" + id)).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "Metotreksat", "scheduleType": "WEEKDAYS", "weekdays": ["MONDAY"],
                                 "startDate": "2026-10-19", "doses": [{"time": "09:00", "amount": 2.5, "unit": "MG"}]}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weekdays[0]").value("MONDAY"))
                .andExpect(jsonPath("$.doses", hasSize(1)))
                .andExpect(jsonPath("$.doses[0].unit").value("MG"));
    }

    @Test
    void otherUserCannotSeeOrDeleteMedication() throws Exception {
        String id = create(signIn("ania"), DAILY_TWICE);
        Cookie ola = signIn("ola");

        mockMvc.perform(get("/api/me/medications").cookie(ola))
                .andExpect(jsonPath("$", hasSize(0)));
        mockMvc.perform(get("/api/me/medications/" + id).cookie(ola))
                .andExpect(status().isNotFound());
        mockMvc.perform(withCsrf(delete("/api/me/medications/" + id)).cookie(ola))
                .andExpect(status().isNotFound());
    }

    @Test
    void deletesMedication() throws Exception {
        Cookie session = signIn("ania");
        String id = create(session, DAILY_TWICE);

        mockMvc.perform(withCsrf(delete("/api/me/medications/" + id)).cookie(session))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/me/medications/" + id).cookie(session))
                .andExpect(status().isNotFound());
    }

    private String create(Cookie session, String body) throws Exception {
        String json = mockMvc.perform(withCsrf(post("/api/me/medications")).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        int start = json.indexOf("\"id\":\"") + "\"id\":\"".length();
        return json.substring(start, json.indexOf('"', start));
    }

    private Cookie signIn(String credential) throws Exception {
        return mockMvc.perform(withCsrf(post("/api/auth/google"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"credential\":\"" + credential + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getCookie("SESSION");
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
