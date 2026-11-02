package pl.dziennikzdrowia.medication.catalog;

/**
 * Poziom odpłatności z obwieszczenia MZ. Kolejność od najtańszego dla pacjenta,
 * więc {@code compareTo} wybiera korzystniejszy poziom.
 * {@link #apiValue()} to wartości, których używa front (domain/medications.ts).
 */
public enum ReimbursementLevel {
    FREE("free"),
    FLAT_RATE("flat_rate"),
    P30("p30"),
    P50("p50"),
    FULL("full");

    private final String apiValue;

    ReimbursementLevel(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }

    /** Kolumna "Poziom odpłatności": "bezpłatny", "bezpłatny do limitu", "ryczałt", "30%", "50%". */
    public static ReimbursementLevel fromAnnouncement(String value) {
        String normalized = value.strip().toLowerCase();
        if (normalized.startsWith("bezpłatny")) {
            return FREE;
        }
        return switch (normalized) {
            case "ryczałt" -> FLAT_RATE;
            case "30%" -> P30;
            case "50%" -> P50;
            default -> null;
        };
    }
}
