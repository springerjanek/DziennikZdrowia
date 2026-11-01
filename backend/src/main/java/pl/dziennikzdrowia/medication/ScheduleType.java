package pl.dziennikzdrowia.medication;

public enum ScheduleType {
    // Codziennie o podanych godzinach.
    DAILY,
    // W wybrane dni tygodnia (UserMedication.weekdays).
    WEEKDAYS,
    // Co N dni, licząc od daty rozpoczęcia (UserMedication.intervalDays).
    EVERY_N_DAYS,
    // W razie potrzeby: jedna dawka bez godziny, opcjonalnie limit na dobę.
    AS_NEEDED
}
