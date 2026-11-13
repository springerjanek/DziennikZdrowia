import { Check, Pill, Stethoscope } from "lucide-react";
import type { UserScreening } from "@/data/screeningHistory";
import {
  monthGrid,
  parseIsoDate,
  toIsoDate,
  type DueScreening,
  type UserMedication,
} from "@/domain";
import { PlanCalendarCell } from "./PlanCalendarCell";
import { PlanMonthSummary } from "./PlanMonthSummary";

type Props = {
  anchor: string;
  today: string;
  screenings: DueScreening[];
  medications: UserMedication[];
  history: UserScreening[];
  onPickDay: (day: string) => void;
};

const WEEKDAY_HEADERS = ["pon", "wt", "śr", "czw", "pt", "sob", "niedz"];

// Badania i wpisy w historii grupujemy raz, zeby kazda kratka nie przegladala
// calej listy od nowa.
function groupByDay<T>(items: T[], day: (item: T) => string | null) {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = day(item);
    if (key !== null) {
      const sameDay = grouped.get(key) ?? [];
      sameDay.push(item);
      grouped.set(key, sameDay);
    }
  }
  return grouped;
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
  const cells = monthGrid(shown.getFullYear(), shown.getMonth());
  const dueByDay = groupByDay(screenings, (screening) => screening.nextDueOn);
  const doneByDay = groupByDay(history, (entry) => entry.performedOn);

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
          return (
            <PlanCalendarCell
              key={iso}
              date={date}
              iso={iso}
              isToday={iso === today}
              medications={medications}
              due={dueByDay.get(iso) ?? []}
              done={doneByDay.get(iso) ?? []}
              onPick={() => onPickDay(iso)}
            />
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

      <PlanMonthSummary
        month={anchor.slice(0, 7)}
        screenings={screenings}
        history={history}
      />
    </div>
  );
}
