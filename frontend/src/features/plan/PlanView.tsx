import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import type { UserScreening } from "@/data/screeningHistory";
import {
  addDays,
  clockTime,
  fullDateLabel,
  monthLabel,
  parseIsoDate,
  toIsoDate,
  weekRangeLabel,
  type DueScreening,
  type PlanEvent,
  type UserMedication,
} from "@/domain";
import { EventDetails } from "./EventDetails";
import { PlanAgenda } from "./PlanAgenda";
import { PlanCalendar } from "./PlanCalendar";
import { PlanDay } from "./PlanDay";
import { PlanWeek } from "./PlanWeek";

type Props = {
  screenings: DueScreening[];
  medications: UserMedication[];
  history: UserScreening[];
};

const VIEWS = [
  { id: "dzien", label: "Dzień" },
  { id: "tydzien", label: "Tydzień" },
  { id: "miesiac", label: "Miesiąc" },
] as const;

type ViewId = (typeof VIEWS)[number]["id"];

const PREVIOUS_LABELS: Record<ViewId, string> = {
  dzien: "Poprzedni dzień",
  tydzien: "Poprzedni tydzień",
  miesiac: "Poprzedni miesiąc",
};

const NEXT_LABELS: Record<ViewId, string> = {
  dzien: "Następny dzień",
  tydzien: "Następny tydzień",
  miesiac: "Następny miesiąc",
};

const MONTH_NAMES = Array.from({ length: 12 }, (_, month) =>
  new Date(2000, month, 1).toLocaleDateString("pl-PL", { month: "long" }),
);

// Rok wstecz na wpisanie badan z przeszlosci, kilka do przodu na plan.
const FIRST_YEAR = new Date().getFullYear() - 1;
const YEARS = Array.from({ length: 7 }, (_, index) => FIRST_YEAR + index);

const navClassName =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-field border border-slate-300 text-slate-600 hover:bg-slate-100";

const selectClassName =
  "min-h-11 rounded-field border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900";

// Jedna data trzyma wszystkie trzy widoki: dzien pokazuje ja sama, tydzien jej
// tydzien, miesiac jej miesiac. Dzieki temu przelaczanie nie gubi miejsca w czasie.
export function PlanView({ screenings, medications, history }: Props) {
  const now = new Date();
  const today = toIsoDate(now);
  const [view, setView] = useState<ViewId>("dzien");
  const [anchor, setAnchor] = useState(today);
  const [picked, setPicked] = useState<PlanEvent | null>(null);

  const shown = parseIsoDate(anchor);

  function shift(by: number): void {
    if (view === "miesiac") {
      setAnchor(
        toIsoDate(new Date(shown.getFullYear(), shown.getMonth() + by, 1)),
      );
    } else {
      setAnchor(addDays(anchor, view === "dzien" ? by : by * 7));
    }
  }

  function showMonth(year: number, month: number): void {
    setAnchor(toIsoDate(new Date(year, month, 1)));
  }

  function pickDay(day: string): void {
    setAnchor(day);
    setView("dzien");
  }

  const label =
    view === "dzien"
      ? fullDateLabel(anchor)
      : view === "tydzien"
        ? weekRangeLabel(anchor)
        : monthLabel(shown.getFullYear(), shown.getMonth());

  return (
    <>
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex gap-1 self-start rounded-field bg-slate-100 p-1">
            {VIEWS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={view === option.id}
                onClick={() => setView(option.id)}
                className={`min-h-11 rounded-field px-4 py-1 font-medium ${
                  view === option.id
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label={PREVIOUS_LABELS[view]}
              onClick={() => shift(-1)}
              className={navClassName}
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label={NEXT_LABELS[view]}
              onClick={() => shift(1)}
              className={navClassName}
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>

            {view === "miesiac" ? (
              <>
                <select
                  aria-label="Miesiąc"
                  value={shown.getMonth()}
                  onChange={(event) =>
                    showMonth(shown.getFullYear(), Number(event.target.value))
                  }
                  className={selectClassName}
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Rok"
                  value={shown.getFullYear()}
                  onChange={(event) =>
                    showMonth(Number(event.target.value), shown.getMonth())
                  }
                  className={selectClassName}
                >
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <h2 className="flex-1 font-semibold">{label}</h2>
            )}

            <button
              type="button"
              onClick={() => setAnchor(today)}
              className="inline-flex min-h-11 items-center rounded-field px-3 py-1 font-medium text-brand-700 hover:bg-brand-50"
            >
              Dziś
            </button>
          </div>

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
