package pl.dziennikzdrowia.medication.catalog;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Kody ATC z Rejestru Produktów Leczniczych. Obwieszczenie MZ nie ma kolumny ATC,
 * więc dociągamy je po GTIN z pełnego eksportu CSV rejestru (ok. 17 MB, generowany codziennie).
 *
 * <p>Format eksportu: separator ";", pola w cudzysłowach, a kolumna "Opakowanie" ma po kilka linii,
 * każde opakowanie zaczyna się od GTIN-u: {@code "05909991023652 ¦ Rpz ¦ 2\n1 fiol. 5 ml\n05909991023669 ¦ ..."}.
 * Wyrobów medycznych i żywności (opatrunki, igły, diety) w rejestrze nie ma, więc nie dostają ATC.
 */
@Component
public class RplAtcClient {

    static final String ATC_COLUMN = "Kod ATC";
    static final String PACKAGES_COLUMN = "Opakowanie";

    private static final CSVFormat FORMAT = CSVFormat.DEFAULT.builder()
            .setDelimiter(';')
            .setHeader()
            .setSkipHeaderRecord(true)
            .get();

    // GTIN na początku linii opakowania; wykaz MZ trzyma GTIN-y 14-cyfrowe (z wiodącym zerem).
    private static final Pattern PACKAGE_GTIN = Pattern.compile("(?m)^\\s*(\\d{13,14})\\b");

    private static final char BOM = 0xFEFF;

    private final RestClient restClient;
    private final URI csvUrl;

    public RplAtcClient(@Value("${app.rpl.csv-url}") URI csvUrl) {
        this.csvUrl = csvUrl;
        HttpClient httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        // Rejestr generuje plik na żądanie, pobieranie trwa nawet kilka minut.
        requestFactory.setReadTimeout(Duration.ofMinutes(5));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /** GTIN (14 cyfr) -> kod ATC. */
    public Map<String, String> downloadAtcByGtin() throws IOException {
        byte[] csv = restClient.get().uri(csvUrl).retrieve().body(byte[].class);
        if (csv == null || csv.length == 0) {
            throw new IOException("Pusty eksport z Rejestru Produktów Leczniczych");
        }
        return parse(new InputStreamReader(new ByteArrayInputStream(csv), StandardCharsets.UTF_8));
    }

    /**
     * GTIN-y bez kodu ATC pomijamy. GTIN, który w rejestrze ma dwa różne kody, też pomijamy:
     * lepiej nie podać ATC niż podać zły.
     */
    static Map<String, String> parse(Reader source) throws IOException {
        try (CSVParser csv = FORMAT.parse(skipBom(source))) {
            if (!csv.getHeaderMap().containsKey(ATC_COLUMN) || !csv.getHeaderMap().containsKey(PACKAGES_COLUMN)) {
                throw new IOException("Brak kolumn '" + ATC_COLUMN + "' i '" + PACKAGES_COLUMN + "' w eksporcie RPL");
            }

            Map<String, String> atcByGtin = new HashMap<>();
            Set<String> conflicting = new HashSet<>();
            for (CSVRecord row : csv) {
                if (!row.isSet(ATC_COLUMN) || !row.isSet(PACKAGES_COLUMN)) {
                    continue;
                }
                String atc = normalizeAtc(row.get(ATC_COLUMN));
                if (atc.isEmpty()) {
                    continue;
                }
                Matcher gtin = PACKAGE_GTIN.matcher(row.get(PACKAGES_COLUMN));
                while (gtin.find()) {
                    String key = gtin.group(1).length() == 13 ? "0" + gtin.group(1) : gtin.group(1);
                    String previous = atcByGtin.putIfAbsent(key, atc);
                    if (previous != null && !previous.equals(atc)) {
                        conflicting.add(key);
                    }
                }
            }
            conflicting.forEach(atcByGtin::remove);
            return atcByGtin;
        }
    }

    /**
     * Produkty złożone mają kilka kodów po przecinku ("L01BA01, L04AX03", szczepionki alergenowe nawet 9);
     * zostawiamy wszystkie, bez powtórzeń ("N05AH03, N05AH03" -> "N05AH03").
     */
    static String normalizeAtc(String value) {
        return Arrays.stream(value.split(","))
                .map(String::strip)
                .filter(code -> !code.isEmpty())
                .distinct()
                .collect(Collectors.joining(", "));
    }

    /** Commons CSV nie usuwa znacznika BOM; bez tego pierwszy nagłówek miałby go na początku nazwy. */
    private static Reader skipBom(Reader source) throws IOException {
        BufferedReader in = new BufferedReader(source);
        in.mark(1);
        if (in.read() != BOM) {
            in.reset();
        }
        return in;
    }
}
