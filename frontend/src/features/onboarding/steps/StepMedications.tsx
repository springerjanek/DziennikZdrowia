import { medicationKey, type Medication } from "@/domain";
import { MedicationSearch } from "@/features/medications/MedicationSearch";
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
  const freeCount = countPotentiallyFreeMedications(draft);

  function add(medication: Medication) {
    onChange({ medications: addMedication(draft.medications, medication) });
  }

  function isAdded(medication: Medication): boolean {
    const key = medicationKey(medication);
    return draft.medications.some(
      (entry) => medicationKey(entry.medication) === key,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Pokażemy, za co zapłacisz mniej, i zbierzemy Twoje leki w jednym
        miejscu.
      </p>

      <MedicationSearch isAdded={isAdded} onPick={add} />

      {draft.medications.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Twoje leki</h2>
          <ul className="flex flex-col gap-2">
            {draft.medications.map((entry) => {
              const key = medicationKey(entry.medication);
              return (
                <li
                  key={key}
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
                          medications: removeMedication(draft.medications, key),
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
                              key,
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
                        {usage === "regular"
                          ? "biorę stale"
                          : "brałem ostatnio"}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
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
