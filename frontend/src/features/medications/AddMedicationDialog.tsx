import { useState } from "react";
import { useRevalidator } from "react-router";
import { Modal } from "@/components/Modal";
import { createUserMedication } from "@/data/userMedications";
import {
  medicationKey,
  userMedicationKey,
  type Medication,
  type UserMedication,
} from "@/domain";
import { draftToRequest, type MedicationDraft } from "./draft";
import { MedicationForm } from "./MedicationForm";
import { MedicationSearch } from "./MedicationSearch";

type AddMedicationDialogProps = {
  medications: UserMedication[];
  draft: MedicationDraft;
  onChange: (changes: Partial<MedicationDraft>) => void;
  onReset: () => void;
  onClose: () => void;
};

// Dwa kroki w jednym okienku: najpierw lek z wykazu, potem jego harmonogram.
// Wybor i wypelniony formularz trzyma strona, wiec zamkniecie okienka ich nie kasuje.
export function AddMedicationDialog({
  medications,
  draft,
  onChange,
  onReset,
  onClose,
}: AddMedicationDialogProps) {
  const revalidator = useRevalidator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lokalna stala, bo TypeScript nie przenosi zawezenia z draft.medication do callbackow.
  const picked = draft.medication;

  function isAdded(medication: Medication): boolean {
    const key = medicationKey(medication);
    return medications.some((current) => userMedicationKey(current) === key);
  }

  function save(medication: Medication): void {
    setSaving(true);
    setError(null);
    createUserMedication(draftToRequest(draft, medication))
      .then(() => {
        void revalidator.revalidate();
        onReset();
        onClose();
      })
      .catch(() => {
        setError("Nie udało się zapisać leku. Spróbuj ponownie.");
        setSaving(false);
      });
  }

  return (
    <Modal title="Dodaj lek" onClose={onClose}>
      {picked === null ? (
        <MedicationSearch
          isAdded={isAdded}
          onPick={(medication) => onChange({ medication })}
          autoFocus
        />
      ) : (
        <MedicationForm
          medication={picked}
          draft={draft}
          saving={saving}
          error={error}
          onChange={onChange}
          onBack={() => onChange({ medication: null })}
          onReset={onReset}
          onSubmit={() => save(picked)}
        />
      )}
    </Modal>
  );
}
