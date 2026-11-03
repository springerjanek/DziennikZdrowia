import type { UserScreening } from "@/data/screeningHistory";
import type { DueScreening } from "./dueScreenings";
import { medicationRunsOn, parseIsoDate, takesMedicationOn } from "./plan";
import {
  formatDose,
  type Dose,
  type UserMedication,
} from "./userMedications";

// Wspolne pola kazdego zdarzenia w kalendarzu. "time" to "HH:mm:ss" albo null,
// gdy zdarzenie nie ma godziny - badania i leki w razie potrzeby jej nie maja.
type PlanEventBase = {
  key: string;
  day: string;
  time: string | null;
  title: string;
  detail: string | null;
};

export type PlanEvent =
  | (PlanEventBase & {
      kind: "dose";
      medication: UserMedication;
      dose: Dose;
    })
  | (PlanEventBase & { kind: "asNeeded"; medication: UserMedication })
  | (PlanEventBase & { kind: "screening"; screening: DueScreening })
  | (PlanEventBase & { kind: "done"; entry: UserScreening });

// Zdarzenia bez godziny ida na gore - tak samo jak pasek "calodn." w kalendarzu
// w telefonie. Dzieki temu wszystko ponizej jest juz uporzadkowane po godzinie.
export function planEventsForDay(
  day: string,
  medications: UserMedication[],
  screenings: DueScreening[],
  history: UserScreening[],
): PlanEvent[] {
  const date = parseIsoDate(day);

  const due: PlanEvent[] = screenings
    .filter((screening) => screening.nextDueOn === day)
    .map((screening) => ({
      kind: "screening",
      key: `badanie-${screening.ruleId}`,
      day,
      time: null,
      title: screening.label,
      detail: "Badanie do zrobienia",
      screening,
    }));

  const done: PlanEvent[] = history
    .filter((entry) => entry.performedOn === day)
    .map((entry) => ({
      kind: "done",
      key: `wykonane-${entry.id}`,
      day,
      time: null,
      title: entry.ruleLabel,
      detail: "Badanie wykonane",
      entry,
    }));

  const asNeeded: PlanEvent[] = medications
    .filter(
      (medication) =>
        medication.scheduleType === "AS_NEEDED" &&
        medicationRunsOn(medication, day),
    )
    .map((medication) => ({
      kind: "asNeeded",
      key: `doraznie-${medication.id}`,
      day,
      time: null,
      title: medication.name,
      detail:
        medication.maxDailyDoses === null
          ? "W razie potrzeby"
          : `W razie potrzeby, najwyżej ${medication.maxDailyDoses} razy na dobę`,
      medication,
    }));

  const doses: PlanEvent[] = medications
    .filter((medication) => takesMedicationOn(medication, date))
    .flatMap((medication) =>
      medication.doses.map((dose) => ({
        kind: "dose" as const,
        key: `dawka-${medication.id}-${dose.time ?? "bez-godziny"}`,
        day,
        time: dose.time,
        title: medication.name,
        detail:
          dose.instruction === null
            ? formatDose(dose)
            : `${formatDose(dose)} — ${dose.instruction}`,
        medication,
        dose,
      })),
    )
    .sort((first, second) => (first.time ?? "").localeCompare(second.time ?? ""));

  return [...due, ...done, ...asNeeded, ...doses];
}

// "HH:mm:ss" z biezacej godziny - do porownania z godzinami dawek.
export function clockTime(now: Date): string {
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}:00`;
}

// Przed ktorym zdarzeniem wypada linia "teraz". Gdy nic juz dzis nie zostalo,
// linia ladnie konczy liste.
export function nowMarkerIndex(events: PlanEvent[], now: string): number {
  const index = events.findIndex(
    (event) => event.time !== null && event.time > now,
  );
  return index === -1 ? events.length : index;
}
