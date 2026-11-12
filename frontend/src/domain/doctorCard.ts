import { longDateLabel } from "./plan";
import {
  describeSchedule,
  formatDose,
  formatDoseTime,
  type UserMedication,
} from "./userMedications";

type Performed = {
  ruleId: string;
  performedOn: string;
};

// Lekarza interesuje, kiedy badanie bylo ostatnio, a nie kazde z dziesieciu lat.
export function latestPerRule<T extends Performed>(history: T[]): T[] {
  const latest = new Map<string, T>();
  for (const entry of history) {
    const known = latest.get(entry.ruleId);
    if (known === undefined || entry.performedOn > known.performedOn) {
      latest.set(entry.ruleId, entry);
    }
  }
  return [...latest.values()].sort((first, second) =>
    second.performedOn.localeCompare(first.performedOn),
  );
}

export function dosageLine(medication: UserMedication): string {
  const doses = medication.doses
    .map((dose) =>
      dose.time === null
        ? formatDose(dose)
        : `${formatDoseTime(dose.time)} ${formatDose(dose)}`,
    )
    .join("; ");
  return `${describeSchedule(medication)}: ${doses}`;
}

/**
 * Tekst do kodu QR: sama lista lekow, bez nazwiska. Kazdy telefon odczyta go
 * aparatem bez internetu i bez naszej aplikacji, a zdjecie samego kodu nie
 * zdradza, czyje to leki.
 */
export function medicationListText(
  medications: UserMedication[],
  today: string,
): string {
  const lines = medications.map((medication, index) => {
    const substance =
      medication.activeSubstance === null
        ? ""
        : ` (${medication.activeSubstance})`;
    return `${index + 1}. ${medication.name}${substance} - ${dosageLine(medication)}`;
  });
  return [`Leki, stan na ${longDateLabel(today)}:`, ...lines].join("\n");
}
