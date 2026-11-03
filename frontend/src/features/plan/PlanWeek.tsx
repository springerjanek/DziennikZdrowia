import type { UserScreening } from "@/data/screeningHistory";
import {
  parseIsoDate,
  planEventsForDay,
  weekDays,
  type DueScreening,
  type PlanEvent,
  type UserMedication,
} from "@/domain";
import { PlanTimeline } from "./PlanTimeline";

type Props = {
  day: string;
  today: string;
  now: string;
  medications: UserMedication[];
  screenings: DueScreening[];
  history: UserScreening[];
  onPickDay: (day: string) => void;
  onPick: (event: PlanEvent) => void;
};

function dayHeading(day: string): string {
  return parseIsoDate(day).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Siedem dni jeden pod drugim, a na szerszym ekranie w dwoch kolumnach.
// Siedem waskich kolumn obok siebie nie zmiescilo by nazw lekow na telefonie.
export function PlanWeek({
  day,
  today,
  now,
  medications,
  screenings,
  history,
  onPickDay,
  onPick,
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {weekDays(day).map((current) => {
        const isToday = current === today;
        const events = planEventsForDay(
          current,
          medications,
          screenings,
          history,
        );

        return (
          <section
            key={current}
            className={`flex flex-col gap-2 rounded-card border bg-white p-3 ${
              isToday ? "border-brand-400 bg-brand-50" : "border-slate-200"
            }`}
          >
            <h3>
              <button
                type="button"
                onClick={() => onPickDay(current)}
                className="inline-flex min-h-11 items-center rounded-field px-2 font-semibold hover:bg-slate-100"
              >
                {dayHeading(current)}
                {isToday && <span className="text-brand-700">&nbsp;— dziś</span>}
              </button>
            </h3>
            <PlanTimeline
              events={events}
              now={isToday ? now : null}
              onPick={onPick}
            />
          </section>
        );
      })}
    </div>
  );
}
