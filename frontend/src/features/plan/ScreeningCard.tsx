import { useState } from "react";
import { useRevalidator } from "react-router";
import { recordScreening } from "@/data/screeningHistory";
import {
  describeDue,
  toIsoDate,
  type DueScreening,
  type ScreeningStatus,
} from "@/domain";
import { formatInterval } from "@/lib/plural";

type Props = {
  screening: DueScreening;
};

function statusClassName(status: ScreeningStatus): string {
  switch (status) {
    case "DUE":
      return "text-danger-600";
    case "NEVER_DONE":
      return "text-brand-700";
    case "UPCOMING":
      return "text-slate-500";
  }
}

export function ScreeningCard({ screening }: Props) {
  // Po zapisie loader musi policzyc status i nastepny termin od nowa.
  const revalidator = useRevalidator();
  const today = toIsoDate(new Date());
  const [open, setOpen] = useState(false);
  const [performedOn, setPerformedOn] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save(): void {
    setSaving(true);
    setError(null);
    recordScreening(screening.ruleId, performedOn)
      .then(() => {
        setOpen(false);
        setSaving(false);
        void revalidator.revalidate();
      })
      .catch(() => {
        setError("Nie udało się zapisać. Spróbuj ponownie.");
        setSaving(false);
      });
  }

  return (
    <li className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <h3 className="flex-1 font-semibold">{screening.label}</h3>
        {screening.source === "PROGRAM_NFZ" ? (
          <span className="shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
            bezpłatne na NFZ
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            zalecenie
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600">{screening.rationale}</p>

      <p className={`text-sm font-medium ${statusClassName(screening.status)}`}>
        {describeDue(screening)}
      </p>

      <p className="text-sm text-slate-500">
        {formatInterval(screening.intervalMonths)}
      </p>

      {open ? (
        <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
          <label
            htmlFor={`kiedy-${screening.ruleId}`}
            className="text-sm font-medium"
          >
            Kiedy je zrobiłeś?
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`kiedy-${screening.ruleId}`}
              type="date"
              value={performedOn}
              max={today}
              onChange={(event) => setPerformedOn(event.target.value)}
              className="rounded-field border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
            >
              {saving ? "Zapisuję…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-field px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Anuluj
            </button>
          </div>
          {error !== null && (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start rounded-field border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
        >
          Zaznacz jako zrobione
        </button>
      )}
    </li>
  );
}
