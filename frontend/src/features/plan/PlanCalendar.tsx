import {
  Check,
  Pill,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import type { UserScreening } from "@/data/screeningHistory";
import {
  describeDue,
  formatDoseTime,
  monthGrid,
  parseIsoDate,
  takesMedicationOn,
  toIsoDate,
  type DueScreening,
  type UserMedication,
} from "@/domain";
import { pluralForm } from "@/lib/plural";
import { HistoryEntry } from "./HistoryEntry";

type Props = {
  anchor: string;
  today: string;
  screenings: DueScreening[];
  medications: UserMedication[];
  history: UserScreening[];
  onPickDay: (day: string) => void;
};

// Co pokazujemy w kratce dnia na szerszym ekranie - jedna linijka na lek albo badanie.
type CellEntry = {
  key: string;
  icon: LucideIcon;
  text: string;
  className: string;
};

const WEEKDAY_HEADERS = ["pon", "wt", "śr", "czw", "pt", "sob", "niedz"];

// Wyzej kratka nie urosnie, wiec reszte dnia zwijamy w "+N wiecej".
const MAX_CELL_ENTRIES = 3;

// Czytnik ekranu dostaje to, czego nie da sie upchnac w komorce: pelna date i co w niej jest.
function dayLabel(
  date: Date,
  medications: number,
  due: number,
  done: number,
): string {
  const parts = [
    date.toLocaleDateString("pl-PL", { day: "numeric", month: "long" }),
  ];
  if (medications > 0) {
    const word = pluralForm(medications, {
      one: "lek",
      few: "leki",
      many: "leków",
    });
    parts.push(`${medications} ${word}`);
  }
  if (due > 0) {
    parts.push("badanie do zrobienia");
  }
  if (done > 0) {
    parts.push("badanie wykonane");
  }
  if (parts.length === 1) {
    parts.push("nic zaplanowanego");
  }
  return parts.join(", ");
}

// Najwczesniejsza godzina leku - w kratce jest miejsce tylko na jedna.
function firstDoseTime(medication: UserMedication): string | null {
  const times = medication.doses
    .map((dose) => dose.time)
    .filter((time): time is string => time !== null)
    .sort();
  return times[0] ?? null;
}

function cellEntries(
  medications: UserMedication[],
  due: DueScreening[],
  done: UserScreening[],
): CellEntry[] {
  return [
    ...due.map((screening) => ({
      key: `badanie-${screening.ruleId}`,
      icon: Stethoscope,
      text: screening.label,
      className: "text-success-700",
    })),
    ...medications.map((medication) => {
      const time = firstDoseTime(medication);
      return {
        key: `lek-${medication.id}`,
        icon: Pill,
        text:
          time === null
            ? medication.name
            : `${formatDoseTime(time)} ${medication.name}`,
        className: "text-slate-700",
      };
    }),
    ...done.map((entry) => ({
      key: `wykonane-${entry.id}`,
      icon: Check,
      text: entry.ruleLabel,
      className: "text-slate-500 line-through",
    })),
  ];
}

export function PlanCalendar({
  anchor,
  today,
  screenings,
  medications,
  history,
  onPickDay,
}: Props) {
  const shown = parseIsoDate(anchor);

  const screeningsByDay = new Map<string, DueScreening[]>();
  for (const screening of screenings) {
    if (screening.nextDueOn !== null) {
      const sameDay = screeningsByDay.get(screening.nextDueOn) ?? [];
      sameDay.push(screening);
      screeningsByDay.set(screening.nextDueOn, sameDay);
    }
  }

  const doneByDay = new Map<string, UserScreening[]>();
  for (const entry of history) {
    const sameDay = doneByDay.get(entry.performedOn) ?? [];
    sameDay.push(entry);
    doneByDay.set(entry.performedOn, sameDay);
  }

  const cells = monthGrid(shown.getFullYear(), shown.getMonth());
  const shownMonth = anchor.slice(0, 7);
  const dueThisMonth = screenings.filter(
    (screening) =>
      screening.nextDueOn !== null &&
      screening.nextDueOn.slice(0, 7) === shownMonth,
  );
  const doneThisMonth = history.filter(
    (entry) => entry.performedOn.slice(0, 7) === shownMonth,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_HEADERS.map((header) => (
          <div
            key={header}
            className="pb-1 text-center text-sm font-medium text-slate-500"
          >
            {header}
          </div>
        ))}

        {cells.map((date, index) => {
          if (date === null) {
            return <div key={`pusty-${index}`} />;
          }

          const iso = toIsoDate(date);
          const doses = medications.filter((medication) =>
            takesMedicationOn(medication, date),
          );
          const due = screeningsByDay.get(iso) ?? [];
          const done = doneByDay.get(iso) ?? [];
          const isToday = iso === today;

          const entries = cellEntries(doses, due, done);
          const visible = entries.slice(0, MAX_CELL_ENTRIES);
          const hidden = entries.length - visible.length;

          return (
            <button
              key={iso}
              type="button"
              aria-current={isToday ? "date" : undefined}
              aria-label={dayLabel(date, doses.length, due.length, done.length)}
              onClick={() => onPickDay(iso)}
              className={`flex min-h-20 flex-col gap-1 rounded-field border p-1 text-left sm:min-h-28 ${
                isToday
                  ? "border-brand-400 bg-brand-50"
                  : "border-slate-200 bg-white hover:border-brand-400"
              }`}
            >
              {/* Dzisiejszy dzien w kolku, tak jak w kalendarzu w telefonie. */}
              <span
                className={
                  isToday
                    ? "inline-flex size-7 shrink-0 items-center justify-center self-center rounded-full bg-brand-600 text-base font-bold text-white sm:self-start"
                    : "self-center text-base font-medium text-slate-700 sm:self-start"
                }
              >
                {date.getDate()}
              </span>

              {/* Na telefonie kratka ma okolo 50 px szerokosci, wiec nazwa leku i tak
                  by sie nie zmiescila - zostaje ikona z liczba. */}
              <span className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 sm:hidden">
                {doses.length > 0 && (
                  <span className="inline-flex items-center text-slate-500">
                    <Pill aria-hidden="true" className="size-4" />
                    <span className="text-xs font-medium">{doses.length}</span>
                  </span>
                )}
                {due.length > 0 && (
                  <Stethoscope
                    aria-hidden="true"
                    className="size-4 text-success-700"
                  />
                )}
                {done.length > 0 && (
                  <Check aria-hidden="true" className="size-4 text-slate-500" />
                )}
              </span>

              <span className="hidden min-w-0 flex-col gap-0.5 sm:flex">
                {visible.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <span
                      key={entry.key}
                      className={`flex min-w-0 items-center gap-1 text-xs ${entry.className}`}
                    >
                      <Icon aria-hidden="true" className="size-3 shrink-0" />
                      <span className="truncate">{entry.text}</span>
                    </span>
                  );
                })}
                {hidden > 0 && (
                  <span className="text-xs text-slate-500">
                    +{hidden} więcej
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Pill aria-hidden="true" className="size-4 text-slate-500" />
          lek do wzięcia
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Stethoscope aria-hidden="true" className="size-4 text-success-700" />
          badanie
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Check aria-hidden="true" className="size-4 text-slate-500" />
          badanie zrobione
        </span>
      </div>

      <p className="text-sm text-slate-500">
        Kliknij w dowolny dzień, żeby zobaczyć godziny i dawki. Leki „w razie
        potrzeby" nie mają stałych dni, więc w siatce ich nie ma — są w widoku
        dnia.
      </p>

      {/* Podsumowanie miesiaca: inaczej, zeby zobaczyc co nas czeka, trzeba by
          klikac dzien po dniu. */}
      {dueThisMonth.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Badania w tym miesiącu</h3>
          <ul className="flex flex-col gap-1">
            {dueThisMonth.map((screening) => (
              <li key={screening.ruleId} className="text-sm text-slate-600">
                <span className="font-medium">{screening.label}</span> —{" "}
                {describeDue(screening)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {doneThisMonth.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold">Wykonane w tym miesiącu</h3>
          <ul className="flex flex-col gap-2">
            {doneThisMonth.map((entry) => (
              <HistoryEntry key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
