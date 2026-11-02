package pl.dziennikzdrowia.medication.catalog;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;

/**
 * Słownik nazw produktów z API NFZ "Refundacja apteczna". To statystyka wykonanych refundacji,
 * więc zawiera leki, które były kiedyś refundowane w aptekach, a nie aktualny wykaz.
 * Odpowiada samymi nazwami, np. "Metfogamma 500".
 */
@Component
public class NfzDictionaryClient {

    private static final Logger log = LoggerFactory.getLogger(NfzDictionaryClient.class);

    record Page(List<String> data) {
    }

    private final RestClient restClient;

    public NfzDictionaryClient(@Value("${app.nfz.api-url}") String apiUrl) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(3))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(3));
        this.restClient = RestClient.builder().baseUrl(apiUrl).requestFactory(requestFactory).build();
    }

    /** Pusta lista, gdy API NFZ nie odpowiada; wyszukiwarka działa wtedy na samym wykazie MZ. */
    public List<String> searchProductNames(String query, int limit) {
        try {
            Page page = restClient.get()
                    .uri(uri -> uri.path("/medicine-products")
                            .queryParam("name", query)
                            .queryParam("limit", limit)
                            .queryParam("api-version", "1.0")
                            .build())
                    .retrieve()
                    .body(Page.class);
            return page == null || page.data() == null ? List.of() : page.data();
        } catch (RestClientException e) {
            log.warn("API NFZ nie odpowiedziało: {}", e.getMessage());
            return List.of();
        }
    }
}
