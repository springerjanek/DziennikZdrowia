import type { UserScreening } from "@/data/screeningHistory";
import {
  fullDateLabel,
  planEventsForDay,
  type DueScreening,
  type PlanEvent,
  type UserMedication,
} from "@/domain";
import { PlanTimeline } from "./PlanTimeline";

type Props = {
  day: string;
  now: string | null;
  medications: UserMedication[];
  screenings: DueScreening[];
  history: UserScreening[];
  onPick: (event: PlanEvent) => void;
};

export function PlanDay({
  day,
  now,
  medications,
  screenings,
  history,
  onPick,
}: Props) {
  const events = planEventsForDay(day, medications, screenings, history);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">
        {fullDateLabel(day)}
        {now !== null && <span className="text-brand-700"> — dziś</span>}
      </h3>
      <PlanTimeline events={events} now={now} onPick={onPick} />
    </div>
  );
}
