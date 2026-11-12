import type { DueScreening } from "./dueScreenings";
import type { UserMedication, Weekday } from "./userMedications";

// getDay() liczy od niedzieli, nasz enum zaczyna sie od poniedzialku.
const WEEKDAY_BY_INDEX: Weekday[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Z czesci daty, nie przez new Date(iso) - to parsuje sie jako UTC i potrafi cofnac dzien.
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Przez UTC, zeby zmiana czasu nie zrobila z doby 23 albo 25 godzin.
function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86400000);
}

// Czy lek jest brany w tym okresie - bez patrzenia na harmonogram. Lek "w razie
// potrzeby" nie ma stalych dni, ale przez caly okres mozna go wziac.
export function medicationRunsOn(
  medication: UserMedication,
  day: string,
): boolean {
  // Daty ISO porownuja sie leksykograficznie, wiec nie trzeba ich parsowac.
  if (day < medication.startDate) {
    return false;
  }
  return medication.endDate === null || day <= medication.endDate;
}

export function takesMedicationOn(
  medication: UserMedication,
  date: Date,
): boolean {
  const day = toIsoDate(date);
  if (!medicationRunsOn(medication, day)) {
    return false;
  }

  switch (medication.scheduleType) {
    case "DAILY":
      return true;
    case "WEEKDAYS":
      return medication.weekdays.includes(WEEKDAY_BY_INDEX[date.getDay()]);
    case "EVERY_N_DAYS": {
      if (medication.intervalDays === null) {
        return false;
      }
      const elapsed = daysBetween(parseIsoDate(medication.startDate), date);
      return elapsed % medication.intervalDays === 0;
    }
    // Brak stalych dni, wiec w kalendarzu sie nie pojawia.
    case "AS_NEEDED":
      return false;
  }
}

// null to puste pola przed pierwszym dniem miesiaca - tydzien zaczynamy w poniedzialek.
export function monthGrid(year: number, month: number): (Date | null)[] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const lastDay = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= lastDay; day += 1) {
    cells.push(new Date(year, month, day));
  }
  return cells;
}

export function addDays(day: string, count: number): string {
  const date = parseIsoDate(day);
  date.setDate(date.getDate() + count);
  return toIsoDate(date);
}

// Tydzien liczymy od poniedzialku, tak jak siatke miesiaca.
export function startOfWeek(day: string): string {
  const date = parseIsoDate(day);
  return addDays(day, -((date.getDay() + 6) % 7));
}

export function weekDays(day: string): string[] {
  const first = startOfWeek(day);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

// "2-8 listopada 2026", a przy przelomie miesiaca "30 listopada - 6 grudnia 2026".
export function weekRangeLabel(day: string): string {
  const days = weekDays(day);
  const from = parseIsoDate(days[0]);
  const to = parseIsoDate(days[6]);
  const sameMonth = from.getMonth() === to.getMonth();
  const fromLabel = from.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: sameMonth ? undefined : "long",
  });
  const toLabel = to.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${fromLabel} - ${toLabel}`;
}

// "czwartek, 26 listopada 2026"
export function longDateLabel(day: string): string {
  return parseIsoDate(day).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function fullDateLabel(day: string): string {
  return parseIsoDate(day).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });
}

export type ScreeningGroup = {
  key: string;
  label: string;
  screenings: DueScreening[];
};

const NO_DATE = "bez-terminu";

// Badania bez wyznaczonej daty ida na gore - to te, ktorych nie ma w historii
// albo ktorych termin juz minal, wiec nie maja gdzie wyladowac w kalendarzu.
export function groupScreeningsByMonth(
  screenings: DueScreening[],
): ScreeningGroup[] {
  const groups = new Map<string, ScreeningGroup>();

  for (const screening of screenings) {
    const date = screening.nextDueOn;
    const key = date === null ? NO_DATE : date.slice(0, 7);
    const existing = groups.get(key);
    if (existing === undefined) {
      const parsed = date === null ? null : parseIsoDate(date);
      groups.set(key, {
        key,
        label:
          parsed === null
            ? "Do zrobienia"
            : monthLabel(parsed.getFullYear(), parsed.getMonth()),
        screenings: [screening],
      });
    } else {
      existing.screenings.push(screening);
    }
  }

  return [...groups.values()].sort((first, second) => {
    if (first.key === NO_DATE) {
      return -1;
    }
    if (second.key === NO_DATE) {
      return 1;
    }
    return first.key.localeCompare(second.key);
  });
}
