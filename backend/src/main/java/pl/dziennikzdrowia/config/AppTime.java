package pl.dziennikzdrowia.config;

import java.time.ZoneId;

/**
 * Strefa czasowa aplikacji. "Dzisiaj" liczymy po polsku, a nie wg strefy serwera
 * (kontener Dockera zwykle chodzi w UTC, co przy polnocy przesuwaloby date o dzien).
 */
public final class AppTime {

    public static final ZoneId ZONE = ZoneId.of("Europe/Warsaw");

    private AppTime() {
    }
}
