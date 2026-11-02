package pl.dziennikzdrowia.screening;

/**
 * Jak liczyc wiek przy sprawdzaniu reguly.
 * YEAR - rocznikowo (rok biezacy - rok urodzenia), tak licza programy NFZ.
 * COMPLETED - ukonczone lata (z uwzglednieniem miesiaca urodzenia).
 */
public enum AgeBasis {
    YEAR,
    COMPLETED
}
