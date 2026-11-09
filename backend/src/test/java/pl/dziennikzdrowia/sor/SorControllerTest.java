package pl.dziennikzdrowia.sor;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Klient kolejkisor.pl jest podmieniony, testy nie wołają prawdziwego API.
 * Cache w SorService żyje przez cały kontekst, więc każdy test pyta o inne współrzędne.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SorControllerTest {

    private static final SorHospital GDANSK = new SorHospital(
            "a1b2c3d4-0000-0000-0000-000000000001", "UCK - SOR", "Gdańsk", "ul. Smoluchowskiego 17",
            2.4, 35, 8, "niskie", 54.37, 18.63);

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private KolejkiSorClient client;

    @Test
    void requiresLogin() throws Exception {
        mockMvc.perform(get("/api/sor/nearest").param("lat", "54.35").param("lon", "18.65"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(client);
    }

    @Test
    void returnsNearestHospitalsWithRoundedCoordinates() throws Exception {
        when(client.nearest(54.35, 18.65, SorService.LIMIT)).thenReturn(List.of(GDANSK));

        mockMvc.perform(signedIn(get("/api/sor/nearest").param("lat", "54.3521").param("lon", "18.6466")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hospitals[0].name").value("UCK - SOR"))
                .andExpect(jsonPath("$.hospitals[0].waitMinutes").value(35))
                .andExpect(jsonPath("$.hospitals[0].distanceKm").value(2.4))
                .andExpect(jsonPath("$.fetchedAt").exists());
    }

    @Test
    void nearbyRequestsShareCachedResult() throws Exception {
        when(client.nearest(anyDouble(), anyDouble(), anyInt())).thenReturn(List.of(GDANSK));

        mockMvc.perform(signedIn(get("/api/sor/nearest").param("lat", "50.061").param("lon", "19.937")))
                .andExpect(status().isOk());
        mockMvc.perform(signedIn(get("/api/sor/nearest").param("lat", "50.059").param("lon", "19.941")))
                .andExpect(status().isOk());

        verify(client, times(1)).nearest(eq(50.06), eq(19.94), anyInt());
    }

    @Test
    void upstreamFailureIsServiceUnavailable() throws Exception {
        when(client.nearest(anyDouble(), anyDouble(), anyInt()))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));

        mockMvc.perform(signedIn(get("/api/sor/nearest").param("lat", "52.23").param("lon", "21.01")))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void rejectsCoordinatesOutOfRange() throws Exception {
        mockMvc.perform(signedIn(get("/api/sor/nearest").param("lat", "91").param("lon", "21")))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(client);
    }

    private static MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request) {
        return request.with(authentication(
                UsernamePasswordAuthenticationToken.authenticated(UUID.randomUUID(), null, List.of())));
    }
}
