package pl.dziennikzdrowia.sor;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

/**
 * Kolejki na SOR-ach z kolejkisor.pl (dane z pacjent.gov.pl). API wymaga klucza i sekretu,
 * a sekretu nie wolno wysłać do przeglądarki - dlatego front pyta nasz backend, nie kolejkisor.pl.
 * Darmowy plan to 50 zapytań na dobę, więc wyniki cache'uje {@link SorService}.
 */
@Component
public class KolejkiSorClient {

    private static final Logger log = LoggerFactory.getLogger(KolejkiSorClient.class);

    private final RestClient restClient;
    private final boolean configured;

    public KolejkiSorClient(@Value("${app.sor.api-url}") String apiUrl,
                            @Value("${app.sor.api-key:}") String apiKey,
                            @Value("${app.sor.api-secret:}") String apiSecret) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(5));
        this.restClient = RestClient.builder()
                .baseUrl(apiUrl)
                .requestFactory(requestFactory)
                .defaultHeader("X-Api-Key", apiKey)
                .defaultHeader("X-Api-Secret", apiSecret)
                .build();
        this.configured = !apiKey.isBlank() && !apiSecret.isBlank();
    }

    /** SOR-y posortowane po odległości od punktu (WGS84). 503, gdy API nie odpowiada albo brak klucza. */
    public List<SorHospital> nearest(double lat, double lon, int limit) {
        if (!configured) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Brak SOR_API_KEY / SOR_API_SECRET w konfiguracji");
        }
        try {
            NearestResponse response = restClient.get()
                    .uri(uri -> uri.path("/hospitals/nearest")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon)
                            .queryParam("limit", limit)
                            .build())
                    .retrieve()
                    .body(NearestResponse.class);
            if (response == null || response.hospitals() == null) {
                return List.of();
            }
            return response.hospitals().stream().map(UpstreamHospital::toHospital).toList();
        } catch (RestClientResponseException e) {
            // 401 = zły klucz, 429 = wyczerpany limit planu. Bez współrzędnych w logu - to lokalizacja użytkownika.
            log.warn("kolejkisor.pl odpowiedziało {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "kolejkisor.pl niedostępne", e);
        } catch (RestClientException e) {
            log.warn("kolejkisor.pl nie odpowiedziało: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "kolejkisor.pl niedostępne", e);
        }
    }
}
