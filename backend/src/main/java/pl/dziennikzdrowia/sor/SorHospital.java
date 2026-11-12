package pl.dziennikzdrowia.sor;

/**
 * SOR w pobliżu użytkownika. Pola z kolejkisor.pl bywają puste (SOR chwilowo nie raportuje),
 * dlatego liczby to obiekty, a nie prymitywy.
 *
 * <p>kolejkisor.pl nie podaje adresu ani współrzędnych SOR-u - nawigację trzeba szukać po nazwie i mieście.
 *
 * @param waitMinutes   szacowany czas oczekiwania na głównej kolejce, w minutach
 * @param totalPatients ilu pacjentów czeka łącznie, we wszystkich priorytetach triage
 * @param loadCategory  słowny opis obciążenia z kolejkisor.pl, np. "umiarkowane obciążenie"
 * @param freshness     czy dane SOR-u są aktualne, np. "aktualne". Gdy szpital przestał raportować
 *                      do pacjent.gov.pl, czas oczekiwania może być sprzed kilku godzin.
 */
public record SorHospital(
        String id,
        String name,
        String city,
        Double distanceKm,
        Integer waitMinutes,
        Integer totalPatients,
        String loadCategory,
        String freshness) {
}
