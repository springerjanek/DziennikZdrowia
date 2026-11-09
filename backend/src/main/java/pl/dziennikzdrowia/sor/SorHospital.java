package pl.dziennikzdrowia.sor;

/**
 * SOR w pobliżu użytkownika. Pola z kolejkisor.pl bywają puste (SOR chwilowo nie raportuje),
 * dlatego liczby to obiekty, a nie prymitywy.
 *
 * @param waitMinutes   szacowany czas oczekiwania na głównej kolejce, w minutach
 * @param totalPatients ilu pacjentów czeka łącznie, we wszystkich priorytetach triage
 * @param loadCategory  słowny opis obciążenia z kolejkisor.pl, np. "niskie", "wysokie"
 * @param lat           współrzędne SOR-u, jeśli API je podało; bez nich nawigacja szuka po nazwie
 */
public record SorHospital(
        String id,
        String name,
        String city,
        String address,
        Double distanceKm,
        Integer waitMinutes,
        Integer totalPatients,
        String loadCategory,
        Double lat,
        Double lon) {
}
