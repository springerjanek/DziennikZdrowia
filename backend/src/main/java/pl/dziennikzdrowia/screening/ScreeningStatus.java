package pl.dziennikzdrowia.screening;

/**
 * Stan badania z perspektywy uzytkownika.
 * NEVER_DONE - brak wpisu w historii, warto zrobic.
 * DUE - termin minal albo wypada dzis.
 * UPCOMING - zrobione, nastepny termin w przyszlosci.
 */
public enum ScreeningStatus {
    NEVER_DONE,
    DUE,
    UPCOMING
}
