import { useState } from "react";
import { type Medication } from "@/domain";
import { searchMedications } from "@/data/medications.mock";
import {
  addMedication,
  countPotentiallyFreeMedications,
  removeMedication,
  setMedicationUsage,
  type OnboardingDraft,
} from "../draft";

type StepMedicationsProps = {
  draft: OnboardingDraft;
  onChange: (changes: Partial<OnboardingDraft>) => void;
};

export function StepMedications({ draft, onChange }: StepMedicationsProps) {
  const [query, setQuery] = useState("");

  const results = searchMedications(query);
  const freeCount = countPotentiallyFreeMedications(draft);

  function add(medication: Medication) {
    onChange({ medications: addMedication(draft.medications, medication) });
  }

  function isAdded(medication: Medication): boolean {
    return draft.medications.some(
      (entry) => entry.medication.name === medication.name,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Przypomnimy o końcu recepty i pokażemy, za co nie musisz płacić.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="medicationSearch" className="text-sm font-medium">
          Szukaj leku
        </label>
        <input
          id="medicationSearch"
          type="search"
          autoComplete="off"
          placeholder="nazwa lub substancja, np. metformina"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-field border border-slate-300 bg-white px-3 py-2.5 placeholder:text-slate-400"
        />
      </div>

      {results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((medication) => {
            const added = isAdded(medication);
            return (
              <li key={medication.name}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => add(medication)}
                  className={`flex w-full items-center gap-3 rounded-field border px-3 py-2.5 text-left ${
                    added
                      ? "border-brand-200 bg-brand-50"
                      : "border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {medication.name}
                    </span>
                    <span className="block truncate text-sm text-slate-500">
                      {medication.activeSubstance}
                    </span>
                  </span>
                  {added && (
                    <span className="shrink-0 text-sm font-semibold text-brand-700">
                      dodany
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-slate-500">Brak wyników dla „{query}".</p>
      )}

      {draft.medications.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Twoje leki</h2>
          <ul className="flex flex-col gap-2">
            {draft.medications.map((entry) => (
              <li
                key={entry.medication.name}
                className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.medication.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Usuń ${entry.medication.name}`}
                    onClick={() =>
                      onChange({
                        medications: removeMedication(
                          draft.medications,
                          entry.medication.name,
                        ),
                      })
                    }
                    className="shrink-0 rounded px-2 text-slate-400 hover:text-danger-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2">
                  {(["regular", "recent"] as const).map((usage) => (
                    <button
                      key={usage}
                      type="button"
                      aria-pressed={entry.usage === usage}
                      onClick={() =>
                        onChange({
                          medications: setMedicationUsage(
                            draft.medications,
                            entry.medication.name,
                            usage,
                          ),
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        entry.usage === usage
                          ? "border-brand-600 bg-brand-50 text-brand-700"
                          : "border-slate-300 text-slate-600"
                      }`}
                    >
                      {usage === "regular" ? "biorę stale" : "brałem ostatnio"}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {freeCount > 0 && (
        <div className="flex flex-col gap-1 rounded-card bg-success-50 p-4">
          <p className="font-semibold text-success-700">
            {freeCount} z {draft.medications.length} leków może Ci przysługiwać
            bezpłatnie
          </p>
          <p className="text-sm text-success-700">
            Poproś lekarza o wpisanie kodu S na recepcie — bez niego apteka
            policzy pełną odpłatność.
          </p>
        </div>
      )}

      {draft.medications.length === 0 && (
        <p className="text-sm text-slate-500">
          Nie musisz tego robić teraz — leki dodasz później w aplikacji.
        </p>
      )}
    </div>
  );
}
