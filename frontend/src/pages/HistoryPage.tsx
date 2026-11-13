import { Plus } from "lucide-react";
import { useState } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import { recordScreening, type UserScreening } from "@/data/screeningHistory";
import { toIsoDate } from "@/domain";
import { DocumentMock } from "@/features/plan/DocumentMock";
import { HistoryEntry } from "@/features/plan/HistoryEntry";
import type { historyLoader } from "./historyLoader";

const FIELD =
  "min-h-11 rounded-field border border-slate-300 bg-white px-3 py-2 text-sm";

type Year = {
  year: string;
  entries: UserScreening[];
};

// Najnowsze na gorze: historia czyta sie wstecz, od tego co bylo ostatnio.
function byYear(history: UserScreening[]): Year[] {
  const sorted = [...history].sort((first, second) =>
    second.performedOn.localeCompare(first.performedOn),
  );
  const years: Year[] = [];
  for (const entry of sorted) {
    const year = entry.performedOn.slice(0, 4);
    const last = years.at(-1);
    if (last === undefined || last.year !== year) {
      years.push({ year, entries: [entry] });
    } else {
      last.entries.push(entry);
    }
  }
  return years;
}

export function HistoryPage() {
  const { history, rules } = useLoaderData<typeof historyLoader>();
  const revalidator = useRevalidator();
  const today = toIsoDate(new Date());

  const [ruleId, setRuleId] = useState(rules[0]?.id ?? "");
  const [performedOn, setPerformedOn] = useState(today);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(): void {
    setSaving(true);
    setError(null);
    recordScreening(ruleId, performedOn, notes.trim() === "" ? null : notes)
      .then(() => {
        setNotes("");
        setSaving(false);
        void revalidator.revalidate();
      })
      .catch(() => {
        setError("Nie udało się zapisać. Sprawdź datę i spróbuj ponownie.");
        setSaving(false);
      });
  }

  const years = byYear(history);

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Historia badań</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-4"
      >
        <h2 className="font-semibold">Dopisz wykonane badanie</h2>
        <p className="text-sm text-slate-600">
          Możesz dodać także badania sprzed lat — od ostatniej daty liczymy
          termin następnego.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule" className="text-sm font-medium">
            Badanie
          </label>
          <select
            id="rule"
            value={ruleId}
            onChange={(event) => setRuleId(event.target.value)}
            className={FIELD}
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="performedOn" className="text-sm font-medium">
            Kiedy je zrobiłeś?
          </label>
          <input
            id="performedOn"
            type="date"
            value={performedOn}
            max={today}
            onChange={(event) => setPerformedOn(event.target.value)}
            className={`${FIELD} self-start`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className="text-sm font-medium">
            Notatka <span className="text-slate-400">(opcjonalnie)</span>
          </label>
          <input
            id="notes"
            type="text"
            maxLength={1000}
            placeholder="np. gdzie wykonane, wynik w normie"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className={FIELD}
          />
        </div>

        <button
          type="submit"
          disabled={saving || ruleId === ""}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-field bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
        >
          <Plus aria-hidden="true" className="size-5" />
          {saving ? "Zapisuję…" : "Dodaj do historii"}
        </button>

        {error !== null && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
      </form>

      <DocumentMock />

      {years.length === 0 ? (
        <p className="text-slate-600">
          Nie masz tu jeszcze żadnych badań. Dopisz je powyżej albo zaznacz
          jako zrobione na stronie z kalendarzem.
        </p>
      ) : (
        years.map((group) => (
          <section key={group.year} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
              {group.year}
            </h2>
            <ul className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-4">
              {group.entries.map((entry) => (
                <HistoryEntry key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
