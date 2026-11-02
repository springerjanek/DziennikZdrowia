package pl.dziennikzdrowia.screening;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import pl.dziennikzdrowia.config.AppTime;
import pl.dziennikzdrowia.user.User;
import pl.dziennikzdrowia.user.UserRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endpointy profilu i profilaktyki na H2 z regulami wczytanymi z prawdziwego screening-rules.json.
 * Daty urodzenia sa liczone od dzisiaj, zeby test nie zestarzal sie za rok.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ScreeningControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserScreeningRepository screeningRepository;

    private UUID userId;

    @BeforeEach
    void setUp() {
        screeningRepository.deleteAll();
        userRepository.deleteAll();
        userId = createUser("sub-ania");
    }

    @Test
    void rulesAreLoadedFromJson() throws Exception {
        mockMvc.perform(as(get("/api/screening/rules"), userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                // Programy NFZ przed zaleceniami.
                .andExpect(jsonPath("$[0].source").value("PROGRAM_NFZ"))
                .andExpect(jsonPath("$[?(@.id == 'mammography')].eligibility.sex").value("FEMALE"));
    }

    @Test
    void endpointsRequireLogin() throws Exception {
        mockMvc.perform(get("/api/screening/rules")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/me/screenings")).andExpect(status().isUnauthorized());
    }

    @Test
    void dueScreeningsWithoutProfileReturns409() throws Exception {
        mockMvc.perform(as(get("/api/me/screenings"), userId)).andExpect(status().isConflict());
    }

    @Test
    void profileIsSavedAndReturned() throws Exception {
        saveProfile(1976, "FEMALE", "diabetes_t2", "hypertension");

        mockMvc.perform(as(get("/api/me/profile"), userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.birthYear").value(1976))
                .andExpect(jsonPath("$.sex").value("FEMALE"))
                .andExpect(jsonPath("$.conditions[0]").value("diabetes_t2"))
                .andExpect(jsonPath("$.conditions[1]").value("hypertension"));
    }

    @Test
    void profileRejectsUnknownConditionAndFutureBirth() throws Exception {
        mockMvc.perform(as(put("/api/me/profile"), userId).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson(1980, "FEMALE", "flu")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(as(put("/api/me/profile"), userId).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson(LocalDate.now(AppTime.ZONE).getYear() + 1, "FEMALE")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void fiftyYearOldWomanGetsMammographyAndColonoscopy() throws Exception {
        saveProfile(yearForAge(50), "FEMALE", "diabetes_t2");

        mockMvc.perform(as(get("/api/me/screenings"), userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.ruleId == 'mammography')].status").value("NEVER_DONE"))
                .andExpect(jsonPath("$[?(@.ruleId == 'colonoscopy')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.ruleId == 'moje_zdrowie')].intervalMonths").value(36))
                .andExpect(jsonPath("$[?(@.ruleId == 'hba1c')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.ruleId == 'psa')]").isEmpty())
                .andExpect(jsonPath("$[?(@.ruleId == 'tsh')]").isEmpty());
    }

    @Test
    void thirtyYearOldManGetsOnlyMojeZdrowie() throws Exception {
        saveProfile(yearForAge(30), "MALE");

        mockMvc.perform(as(get("/api/me/screenings"), userId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].ruleId").value("moje_zdrowie"))
                .andExpect(jsonPath("$[0].intervalMonths").value(60));
    }

    @Test
    void recordedScreeningSetsNextDueDate() throws Exception {
        saveProfile(yearForAge(50), "FEMALE");
        LocalDate performedOn = LocalDate.now(AppTime.ZONE).minusMonths(6);

        mockMvc.perform(as(post("/api/me/screenings"), userId).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleId\":\"mammography\",\"performedOn\":\"" + performedOn + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ruleLabel").value("Mammografia"));

        mockMvc.perform(as(get("/api/me/screenings"), userId))
                .andExpect(jsonPath("$[?(@.ruleId == 'mammography')].status").value("UPCOMING"))
                .andExpect(jsonPath("$[?(@.ruleId == 'mammography')].lastPerformedOn").value(performedOn.toString()))
                .andExpect(jsonPath("$[?(@.ruleId == 'mammography')].nextDueOn")
                        .value(performedOn.plusMonths(24).toString()));
    }

    @Test
    void recordRejectsFutureDateAndUnknownRule() throws Exception {
        LocalDate tomorrow = LocalDate.now(AppTime.ZONE).plusDays(1);

        mockMvc.perform(as(post("/api/me/screenings"), userId).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleId\":\"mammography\",\"performedOn\":\"" + tomorrow + "\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(as(post("/api/me/screenings"), userId).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleId\":\"nie-ma\",\"performedOn\":\"2025-01-01\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void userCannotDeleteSomeoneElsesScreening() throws Exception {
        UUID otherUser = createUser("sub-jan");
        String body = mockMvc.perform(as(post("/api/me/screenings"), otherUser).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ruleId\":\"colonoscopy\",\"performedOn\":\"2025-01-01\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = body.replaceAll(".*\"id\":\"([^\"]+)\".*", "$1");

        mockMvc.perform(as(delete("/api/me/screenings/" + id), userId).with(csrf()))
                .andExpect(status().isNotFound());

        mockMvc.perform(as(delete("/api/me/screenings/" + id), otherUser).with(csrf()))
                .andExpect(status().isNoContent());
        mockMvc.perform(as(get("/api/me/screenings/history"), otherUser))
                .andExpect(jsonPath("$.length()").value(0));
    }

    private UUID createUser(String sub) {
        User user = new User();
        user.setGoogleSub(sub);
        user.setEmail(sub + "@example.com");
        return userRepository.save(user).getId();
    }

    private void saveProfile(int birthYear, String sex, String... conditions) throws Exception {
        mockMvc.perform(as(put("/api/me/profile"), userId).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(profileJson(birthYear, sex, conditions)))
                .andExpect(status().isOk());
    }

    private static String profileJson(int birthYear, String sex, String... conditions) {
        String list = String.join(",", List.of(conditions).stream().map(c -> "\"" + c + "\"").toList());
        return "{\"birthYear\":" + birthYear + ",\"birthMonth\":1,\"sex\":\"" + sex + "\",\"conditions\":[" + list + "]}";
    }

    // Styczen + rocznik -> wiek rocznikowy i ukonczony sa rowne przez caly rok.
    private static int yearForAge(int age) {
        return LocalDate.now(AppTime.ZONE).getYear() - age;
    }

    // Zalogowany uzytkownik tak jak po AuthController: principal = UUID.
    private static MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder request, UUID userId) {
        RequestPostProcessor auth = authentication(
                UsernamePasswordAuthenticationToken.authenticated(userId, null, List.of()));
        return request.with(auth);
    }
}
