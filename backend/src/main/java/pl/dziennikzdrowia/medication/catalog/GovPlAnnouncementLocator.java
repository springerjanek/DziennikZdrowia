package pl.dziennikzdrowia.medication.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Znajduje na gov.pl najnowsze obwieszczenie MZ w sprawie wykazu leków refundowanych
 * i pobiera jego załącznik XLSX. MZ nie publikuje stałego adresu ani API,
 * więc czytamy HTML strony z listą obwieszczeń.
 */
@Component
public class GovPlAnnouncementLocator {

    private static final String GOV_PL = "https://www.gov.pl";
    private static final Pattern ANNOUNCEMENT_LINK = Pattern.compile(
            "href=\"(/web/zdrowie/obwieszczenie-ministra-zdrowia-z-dnia-[^\"]*-na-(\\d{1,2})-([a-z]+)-(\\d{4})-r)\"");

    // <a href="/attachment/<uuid>" ... aria-label=" Pobierz plik 84W zalacznik do obwieszczenia Rozmiar: 0.86MB Format: xlsx">
    private static final Pattern XLSX_ATTACHMENT = Pattern.compile(
            "href=\"(/attachment/[0-9a-fA-F-]+)\"[^>]*aria-label=\"[^\"]*za[łl][ąa]cznik[ _]do[ _]obwieszczenia[^\"]*Format: xlsx\"",
            Pattern.CASE_INSENSITIVE);

    private static final Map<String, Integer> MONTHS = Map.ofEntries(
            Map.entry("stycznia", 1), Map.entry("lutego", 2), Map.entry("marca", 3),
            Map.entry("kwietnia", 4), Map.entry("maja", 5), Map.entry("czerwca", 6),
            Map.entry("lipca", 7), Map.entry("sierpnia", 8), Map.entry("wrzesnia", 9),
            Map.entry("pazdziernika", 10), Map.entry("listopada", 11), Map.entry("grudnia", 12));

    private final RestClient restClient;
    private final URI listingUrl;

    public GovPlAnnouncementLocator(@Value("${app.reimbursement.listing-url}") URI listingUrl) {
        this.listingUrl = listingUrl;
        HttpClient httpClient = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofSeconds(60));
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    /**
     * Najnowsze obwieszczenie, które już obowiązuje. Następne pojawia się na liście
     * ok. dwa tygodnie wcześniej, ale do tego czasu apteki liczą po starym.
     */
    public Optional<Announcement> findCurrent(LocalDate today) {
        String html = restClient.get().uri(listingUrl).retrieve().body(String.class);
        return findCurrent(html == null ? "" : html, today);
    }

    static Optional<Announcement> findCurrent(String listingHtml, LocalDate today) {
        Announcement best = null;
        Matcher matcher = ANNOUNCEMENT_LINK.matcher(listingHtml);
        while (matcher.find()) {
            Integer month = MONTHS.get(matcher.group(3));
            if (month == null) {
                continue;
            }
            LocalDate effectiveDate = LocalDate.of(
                    Integer.parseInt(matcher.group(4)), month, Integer.parseInt(matcher.group(2)));
            if (effectiveDate.isAfter(today)) {
                continue;
            }
            if (best == null || effectiveDate.isAfter(best.effectiveDate())) {
                best = new Announcement(effectiveDate, URI.create(GOV_PL + matcher.group(1)));
            }
        }
        return Optional.ofNullable(best);
    }

    public byte[] downloadXlsx(Announcement announcement) {
        String html = restClient.get().uri(announcement.pageUrl()).retrieve().body(String.class);
        URI xlsxUrl = findXlsxAttachment(html == null ? "" : html)
                .orElseThrow(() -> new IllegalStateException(
                        "Brak załącznika XLSX na stronie " + announcement.pageUrl()));
        return restClient.get().uri(xlsxUrl).retrieve().body(byte[].class);
    }

    static Optional<URI> findXlsxAttachment(String announcementHtml) {
        Matcher matcher = XLSX_ATTACHMENT.matcher(announcementHtml);
        if (!matcher.find()) {
            return Optional.empty();
        }
        return Optional.of(URI.create(GOV_PL + matcher.group(1)));
    }
}
