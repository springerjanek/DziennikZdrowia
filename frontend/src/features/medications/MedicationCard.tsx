import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { deleteUserMedication } from "@/data/userMedications";
import {
  describeSchedule,
  formatDose,
  formatReimbursementCost,
  formatDoseTime,
  reimbursementLabel,
  type UserMedication,
} from "@/domain";

type MedicationCardProps = {
  medication: UserMedication;
  onEdit: () => void;
};

export function MedicationCard({ medication, onEdit }: MedicationCardProps) {
  const revalidator = useRevalidator();
  // Dwa klikniecia zamiast okienka z potwierdzeniem, tak samo jak w historii badan.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cost = formatReimbursementCost(medication.reimbursement);

  function remove(): void {
    setError(null);
    deleteUserMedication(medication.id)
      .then(() => void revalidator.revalidate())
      .catch(() => {
        setError("Nie udało się usunąć.");
        setConfirming(false);
      });
  }

  return (
    <li className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{medication.name}</h2>
          {medication.activeSubstance !== null && (
            <p className="text-sm text-slate-500">
              {medication.activeSubstance}
            </p>
          )}
        </div>

        {confirming ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={remove}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium bg-danger-600 text-white hover:bg-danger-700"
            >
              Na pewno usuń
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Anuluj
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label={`Edytuj ${medication.name}`}
              onClick={onEdit}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700"
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edytuj
            </button>
            <button
              type="button"
              aria-label={`Usuń ${medication.name}`}
              onClick={() => setConfirming(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:border-danger-600 hover:bg-danger-50 hover:text-danger-700"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Usuń
            </button>
          </div>
        )}
      </div>

      <p className="text-sm font-medium text-brand-700">
        {describeSchedule(medication)}
      </p>

      <ul className="flex flex-col gap-0.5 text-sm text-slate-600">
        {medication.doses.map((dose) => (
          <li key={dose.time ?? "bez-godziny"}>
            {dose.time !== null && (
              <span className="font-medium">{formatDoseTime(dose.time)} </span>
            )}
            {formatDose(dose)}
            {dose.instruction !== null && ` — ${dose.instruction}`}
          </li>
        ))}
      </ul>

      {medication.notes !== null && (
        <p className="text-sm text-slate-500">{medication.notes}</p>
      )}

      <p className="text-sm text-slate-500">
        Odpłatność: {reimbursementLabel(medication.reimbursement.level)}
        {cost !== null && ` — ${cost}`}
      </p>

      {error !== null && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </li>
  );
}
