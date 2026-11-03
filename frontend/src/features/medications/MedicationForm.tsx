import { Check, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  DOSE_UNITS,
  doseUnitLabel,
  WEEKDAYS,
  weekdayLabel,
  type DoseUnit,
  type Medication,
  type ScheduleType,
  type Weekday,
} from "@/domain";
import {
  draftDoses,
  emptyDose,
  problemWith,
  type DoseDraft,
  type MedicationDraft,
} from "./draft";

const SCHEDULE_LABELS: { type: ScheduleType; label: string }[] = [
  { type: "DAILY", label: "codziennie" },
  { type: "WEEKDAYS", label: "w wybrane dni" },
  { type: "EVERY_N_DAYS", label: "co kilka dni" },
  { type: "AS_NEEDED", label: "w razie potrzeby" },
];

const MAX_DOSES = 24;

const FIELD =
  "min-h-11 rounded-field border border-slate-300 bg-white px-3 py-2 text-sm";

type MedicationFormProps = {
  medication: Medication;
  draft: MedicationDraft;
  saving: boolean;
  error: string | null;
  onChange: (changes: Partial<MedicationDraft>) => void;
  onSubmit: () => void;
  onReset: () => void;
  // Przy edycji leku nie wracamy do wyszukiwarki: kod opakowania jest kluczem
  // do refundacji, wiec innego leku nie podmieniamy w tym samym wpisie.
  onBack?: () => void;
  submitLabel?: string;
  resetLabel?: string;
};

export function MedicationForm({
  medication,
  draft,
  saving,
  error,
  onChange,
  onSubmit,
  onReset,
  onBack,
  submitLabel = "Zapisz lek",
  resetLabel = "Zacznij od nowa",
}: MedicationFormProps) {
  const [problem, setProblem] = useState<string | null>(null);

  const asNeeded = draft.scheduleType === "AS_NEEDED";
  const doses = draftDoses(draft);

  function updateDose(index: number, changes: Partial<DoseDraft>): void {
    onChange({
      doses: draft.doses.map((dose, current) =>
        current === index ? { ...dose, ...changes } : dose,
      ),
    });
  }

  function toggleWeekday(day: Weekday): void {
    onChange({
      weekdays: draft.weekdays.includes(day)
        ? draft.weekdays.filter((current) => current !== day)
        : WEEKDAYS.filter(
            (current) => current === day || draft.weekdays.includes(current),
          ),
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const found = problemWith(draft);
    setProblem(found);
    if (found === null) {
      onSubmit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-card bg-slate-50 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{medication.name}</p>
          <p className="truncate text-sm text-slate-500">
            {[medication.packSize, medication.activeSubstance]
              .filter((part) => part !== null)
              .join(" · ")}
          </p>
        </div>
        {onBack !== undefined && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 shrink-0 items-center rounded-field px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Zmień lek
          </button>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Jak często?</legend>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_LABELS.map((option) => (
            <button
              key={option.type}
              type="button"
              aria-pressed={draft.scheduleType === option.type}
              onClick={() => onChange({ scheduleType: option.type })}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium ${
                draft.scheduleType === option.type
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-300 text-slate-600 hover:border-brand-400"
              }`}
            >
              {draft.scheduleType === option.type && (
                <Check aria-hidden="true" className="size-4" />
              )}
              {option.label}
            </button>
          ))}
        </div>

        {draft.scheduleType === "WEEKDAYS" && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={draft.weekdays.includes(day)}
                onClick={() => toggleWeekday(day)}
                className={`inline-flex min-h-11 items-center gap-1 rounded-field border px-3 py-2 text-sm ${
                  draft.weekdays.includes(day)
                    ? "border-brand-600 bg-brand-50 font-medium text-brand-700"
                    : "border-slate-300 text-slate-600 hover:border-brand-400"
                }`}
              >
                {draft.weekdays.includes(day) && (
                  <Check aria-hidden="true" className="size-4" />
                )}
                {weekdayLabel(day)}
              </button>
            ))}
          </div>
        )}

        {draft.scheduleType === "EVERY_N_DAYS" && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            co
            <input
              type="number"
              min="2"
              max="365"
              value={draft.intervalDays}
              onChange={(event) =>
                onChange({ intervalDays: event.target.value })
              }
              className={`w-20 ${FIELD}`}
            />
            dni
          </label>
        )}

        {asNeeded && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            maksymalnie
            <input
              type="number"
              min="1"
              max="24"
              placeholder="bez limitu"
              value={draft.maxDailyDoses}
              onChange={(event) =>
                onChange({ maxDailyDoses: event.target.value })
              }
              className={`w-28 ${FIELD}`}
            />
            razy na dobę
          </label>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">
          {asNeeded ? "Jednorazowa dawka" : "Pory i dawki"}
        </h3>
        <ul className="flex flex-col gap-2">
          {doses.map((dose, index) => (
            <li key={index} className="flex flex-wrap items-center gap-2">
              {!asNeeded && (
                <input
                  type="time"
                  aria-label="Godzina"
                  value={dose.time}
                  onChange={(event) =>
                    updateDose(index, { time: event.target.value })
                  }
                  className={FIELD}
                />
              )}
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                aria-label="Dawka"
                value={dose.amount}
                onChange={(event) =>
                  updateDose(index, { amount: event.target.value })
                }
                className={`w-20 ${FIELD}`}
              />
              <select
                aria-label="Jednostka"
                value={dose.unit}
                onChange={(event) =>
                  updateDose(index, { unit: event.target.value as DoseUnit })
                }
                className={FIELD}
              >
                {DOSE_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {doseUnitLabel(unit)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                aria-label="Wskazówka"
                placeholder="np. po jedzeniu"
                maxLength={200}
                value={dose.instruction}
                onChange={(event) =>
                  updateDose(index, { instruction: event.target.value })
                }
                className={`min-w-32 flex-1 ${FIELD}`}
              />
              {doses.length > 1 && (
                <button
                  type="button"
                  aria-label={`Usuń porę ${dose.time}`}
                  onClick={() =>
                    onChange({
                      doses: draft.doses.filter(
                        (_, current) => current !== index,
                      ),
                    })
                  }
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-field border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-danger-600 hover:bg-danger-50 hover:text-danger-700"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Usuń
                </button>
              )}
            </li>
          ))}
        </ul>
        {!asNeeded && draft.doses.length < MAX_DOSES && (
          <button
            type="button"
            onClick={() => onChange({ doses: [...draft.doses, emptyDose()] })}
            className="inline-flex min-h-11 items-center self-start rounded-field border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Dodaj porę
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className="text-sm font-medium">
            Od kiedy
          </label>
          <input
            id="startDate"
            type="date"
            value={draft.startDate}
            onChange={(event) => onChange({ startDate: event.target.value })}
            className={FIELD}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className="text-sm font-medium">
            Do kiedy <span className="text-slate-400">(opcjonalnie)</span>
          </label>
          <input
            id="endDate"
            type="date"
            min={draft.startDate}
            value={draft.endDate}
            onChange={(event) => onChange({ endDate: event.target.value })}
            className={FIELD}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notatka <span className="text-slate-400">(opcjonalnie)</span>
        </label>
        <textarea
          id="notes"
          rows={2}
          maxLength={1000}
          placeholder="np. zapisał dr Kowalski, recepta do końca marca"
          value={draft.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          className={`${FIELD} placeholder:text-slate-400`}
        />
      </div>

      {(problem ?? error) !== null && (
        <p role="alert" className="text-sm text-danger-600">
          {problem ?? error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
        >
          {saving ? "Zapisuję…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            setProblem(null);
            onReset();
          }}
          className="inline-flex min-h-11 items-center rounded-field px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          {resetLabel}
        </button>
      </div>
    </form>
  );
}
