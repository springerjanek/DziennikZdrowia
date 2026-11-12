import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  fullDateLabel,
  monthLabel,
  parseIsoDate,
  toIsoDate,
  weekRangeLabel,
} from "@/domain";

const VIEWS = [
  { id: "dzien", label: "Dzień" },
  { id: "tydzien", label: "Tydzień" },
  { id: "miesiac", label: "Miesiąc" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

type Props = {
  view: ViewId;
  anchor: string;
  today: string;
  onView: (view: ViewId) => void;
  onAnchor: (day: string) => void;
};

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

export function PlanToolbar({
  view,
  anchor,
  today,
  onView,
  onAnchor,
}: Props) {
  const shown = parseIsoDate(anchor);

  function showMonth(year: number, month: number): void {
    onAnchor(toIsoDate(new Date(year, month, 1)));
  }

  function shift(by: number): void {
    if (view === "miesiac") {
      showMonth(shown.getFullYear(), shown.getMonth() + by);
    } else {
      onAnchor(addDays(anchor, view === "dzien" ? by : by * 7));
    }
  }

  const label =
    view === "dzien"
      ? fullDateLabel(anchor)
      : view === "tydzien"
        ? weekRangeLabel(anchor)
        : monthLabel(shown.getFullYear(), shown.getMonth());

  return (
    <>
      <div className="flex gap-1 self-start rounded-field bg-slate-100 p-1">
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={view === option.id}
            onClick={() => onView(option.id)}
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
          onClick={() => onAnchor(today)}
          className="inline-flex min-h-11 items-center rounded-field px-3 py-1 font-medium text-brand-700 hover:bg-brand-50"
        >
          Dziś
        </button>
      </div>
    </>
  );
}
