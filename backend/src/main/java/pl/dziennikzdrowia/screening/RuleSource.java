package pl.dziennikzdrowia.screening;

/**
 * Skad pochodzi regula.
 * PROGRAM_NFZ - bezplatny program NFZ, twarde kryteria (wiek, plec).
 * RECOMMENDATION - dobra praktyka / zalecenie, zwykle platne albo przez lekarza.
 */
public enum RuleSource {
    PROGRAM_NFZ,
    RECOMMENDATION
}
