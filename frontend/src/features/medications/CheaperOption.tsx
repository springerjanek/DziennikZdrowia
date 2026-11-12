import { CalendarPlus, PiggyBank } from "lucide-react";
import { useState } from "react";
import { addDays, formatZloty, toIsoDate, type Savings } from "@/domain";
import { buildIcs, downloadIcs } from "@/lib/calendarEvent";

type Props = {
  medicationName: string;
  savings: Savings;
};

// Tydzien do przodu: nie wiemy, ile tabletek zostalo w pudelku, wiec data jest
// tylko propozycja - uzytkownik ja zmienia przed dodaniem do kalendarza.
const DEFAULT_DAYS_AHEAD = 7;

export function CheaperOption({ medicationName, savings }: Props) {
  const { best, ownPerUnit, monthlySaving } = savings;
  const [day, setDay] = useState(
    addDays(toIsoDate(new Date()), DEFAULT_DAYS_AHEAD),
  );

  function addToCalendar(): void {
    const what =
      best.kind === "pack"
        ? `${medicationName} w opakowaniu ${best.packSize}`
        : `${best.name}, ${best.packSize}`;
    downloadIcs(
      "przypomnienie-lek.ics",
      buildIcs({
        title: `Kup taniej: ${what}`,
        description:
          `Dopłata ${formatZloty(best.surcharge)} zł za opakowanie, ` +
          `czyli ${formatZloty(best.perUnit)} zł za sztukę zamiast ` +
          `${formatZloty(ownPerUnit)} zł. Zamiennik wydaje farmaceuta - ` +
          `pokaż mu nazwę w aptece.`,
        day,
      }),
    );
  }

  // Przy tanich tabletkach obie kwoty zaokraglaja sie do tego samego grosza -
  // wtedy porownanie za sztuke nic nie wnosi.
  const perUnitWorthShowing =
    formatZloty(best.perUnit) !== formatZloty(ownPerUnit);

  return (
    <div className="flex flex-col gap-1 rounded-field bg-success-50 px-3 py-2 text-sm text-success-700">
      <p className="flex items-center gap-1.5 font-medium">
        <PiggyBank aria-hidden="true" className="size-5 shrink-0" />
        {best.kind === "pack"
          ? `Większe opakowanie wychodzi taniej: ${best.packSize}`
          : `Tańszy zamiennik: ${best.name}, ${best.packSize}`}
      </p>

      {perUnitWorthShowing && (
        <p>
          {formatZloty(best.perUnit)} zł za sztukę zamiast{" "}
          {formatZloty(ownPerUnit)} zł. Dopłata za opakowanie:{" "}
          {formatZloty(best.surcharge)} zł.
        </p>
      )}

      {monthlySaving !== null && monthlySaving >= 0.01 && (
        <p>
          Przy Twoim dawkowaniu to około {formatZloty(monthlySaving)} zł mniej
          miesięcznie.
        </p>
      )}

      {best.kind === "substitute" && (
        <p className="text-slate-600">
          To inny producent tej samej substancji w tej samej dawce i postaci.
          Zapytaj w aptece — zamiennik wydaje farmaceuta.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 pt-1">
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          Przypomnij mi
          <input
            type="date"
            value={day}
            min={toIsoDate(new Date())}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-11 rounded-field border border-slate-300 bg-white px-3 py-2 text-slate-900"
          />
        </label>
        <button
          type="button"
          onClick={addToCalendar}
          className="inline-flex min-h-11 items-center gap-2 rounded-field border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <CalendarPlus aria-hidden="true" className="size-5" />
          Dodaj do kalendarza
        </button>
      </div>
    </div>
  );
}
