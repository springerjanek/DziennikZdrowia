package pl.dziennikzdrowia.sor;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Najbliższe SOR-y z krótkim cache. Darmowy plan kolejkisor.pl to 50 zapytań na dobę,
 * a kolejki i tak odświeżają się co kilka minut.
 *
 * <p>Współrzędne zaokrąglamy do 0,01° (ok. 1 km): sąsiednie zapytania trafiają w ten sam wpis
 * cache, a do kolejkisor.pl nie trafia dokładne położenie użytkownika.
 */
@Service
public class SorService {

    static final int LIMIT = 10;
    static final Duration TTL = Duration.ofMinutes(5);
    private static final int MAX_ENTRIES = 1000;

    record Key(double lat, double lon) {
    }

    record Entry(List<SorHospital> hospitals, Instant fetchedAt) {
    }

    private final KolejkiSorClient client;
    private final Clock clock;
    private final Map<Key, Entry> cache = new ConcurrentHashMap<>();

    @Autowired
    public SorService(KolejkiSorClient client) {
        this(client, Clock.systemUTC());
    }

    // Testowy konstruktor
    SorService(KolejkiSorClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    public NearestSorResponse nearest(double lat, double lon) {
        Key key = new Key(round(lat), round(lon));
        Instant now = clock.instant();
        Entry cached = cache.get(key);
        if (cached != null && cached.fetchedAt().plus(TTL).isAfter(now)) {
            return new NearestSorResponse(cached.hospitals(), cached.fetchedAt());
        }

        List<SorHospital> hospitals = client.nearest(key.lat(), key.lon(), LIMIT);
        if (cache.size() >= MAX_ENTRIES) {
            cache.values().removeIf(entry -> !entry.fetchedAt().plus(TTL).isAfter(now));
            if (cache.size() >= MAX_ENTRIES) {
                cache.clear();
            }
        }
        cache.put(key, new Entry(hospitals, now));
        return new NearestSorResponse(hospitals, now);
    }

    static double round(double degrees) {
        return Math.round(degrees * 100) / 100.0;
    }

}
