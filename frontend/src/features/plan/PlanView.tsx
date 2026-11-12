import { useState } from "react";
import { Modal } from "@/components/Modal";
import type { UserScreening } from "@/data/screeningHistory";
import {
  clockTime,
  toIsoDate,
  type DueScreening,
  type PlanEvent,
  type UserMedication,
} from "@/domain";
import { EventDetails } from "./EventDetails";
import { PlanAgenda } from "./PlanAgenda";
import { PlanCalendar } from "./PlanCalendar";
import { PlanDay } from "./PlanDay";
import { PlanToolbar, type ViewId } from "./PlanToolbar";
import { PlanWeek } from "./PlanWeek";

type Props = {
  screenings: DueScreening[];
  medications: UserMedication[];
  history: UserScreening[];
};

// Jedna data trzyma wszystkie trzy widoki: dzien pokazuje ja sama, tydzien jej
// tydzien, miesiac jej miesiac. Dzieki temu przelaczanie nie gubi miejsca w czasie.
export function PlanView({ screenings, medications, history }: Props) {
  const now = new Date();
  const today = toIsoDate(now);
  const [view, setView] = useState<ViewId>("dzien");
  const [anchor, setAnchor] = useState(today);
  const [picked, setPicked] = useState<PlanEvent | null>(null);

  function pickDay(day: string): void {
    setAnchor(day);
    setView("dzien");
  }

  return (
    <>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <PlanToolbar
            view={view}
            anchor={anchor}
            today={today}
            onView={setView}
            onAnchor={setAnchor}
          />

          {view === "dzien" && (
            <PlanDay
              day={anchor}
              now={anchor === today ? clockTime(now) : null}
              medications={medications}
              screenings={screenings}
              history={history}
              onPick={setPicked}
            />
          )}

          {view === "tydzien" && (
            <PlanWeek
              day={anchor}
              today={today}
              now={clockTime(now)}
              medications={medications}
              screenings={screenings}
              history={history}
              onPickDay={pickDay}
              onPick={setPicked}
            />
          )}

          {view === "miesiac" && (
            <PlanCalendar
              anchor={anchor}
              today={today}
              screenings={screenings}
              medications={medications}
              history={history}
              onPickDay={pickDay}
            />
          )}
        </div>

        {/* Na szerokim ekranie plan badan siedzi obok kalendarza i przewija sie
            osobno - glowny widok ma miescic jak najwiecej bez scrollowania strony. */}
        <aside className="flex flex-col gap-3 rounded-card border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto">
          <h2 className="text-base font-semibold">
            Twój plan na najbliższy rok
          </h2>
          <PlanAgenda screenings={screenings} />
        </aside>
      </div>

      {picked !== null && (
        <Modal title={picked.title} onClose={() => setPicked(null)}>
          <EventDetails event={picked} />
        </Modal>
      )}
    </>
  );
}
