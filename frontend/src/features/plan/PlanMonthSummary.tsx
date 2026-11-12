import type { UserScreening } from "@/data/screeningHistory";
import { describeDue, type DueScreening } from "@/domain";
import { HistoryEntry } from "./HistoryEntry";

type Props = {
  month: string;
  screenings: DueScreening[];
  history: UserScreening[];
};

// Podsumowanie miesiaca pod siatka: inaczej, zeby zobaczyc co nas czeka,
// trzeba by klikac dzien po dniu.
export function PlanMonthSummary({ month, screenings, history }: Props) {
  const due = screenings.filter(
    (screening) =>
      screening.nextDueOn !== null &&
      screening.nextDueOn.slice(0, 7) === month,
  );
  const done = history.filter((entry) => entry.performedOn.slice(0, 7) === month);

  return (
    <>
      {due.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Badania w tym miesiącu</h3>
          <ul className="flex flex-col gap-1">
            {due.map((screening) => (
              <li key={screening.ruleId} className="text-sm text-slate-600">
                <span className="font-medium">{screening.label}</span> —{" "}
                {describeDue(screening)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {done.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold">Wykonane w tym miesiącu</h3>
          <ul className="flex flex-col gap-2">
            {done.map((entry) => (
              <HistoryEntry key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
