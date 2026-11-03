import { useState } from "react";
import { useRevalidator } from "react-router";
import { Modal } from "@/components/Modal";
import { updateUserMedication } from "@/data/userMedications";
import type { UserMedication } from "@/domain";
import {
  draftFromMedication,
  draftToRequest,
  type MedicationDraft,
} from "./draft";
import { MedicationForm } from "./MedicationForm";

type EditMedicationDialogProps = {
  medication: UserMedication;
  draft: MedicationDraft;
  onChange: (changes: Partial<MedicationDraft>) => void;
  onReplace: (draft: MedicationDraft) => void;
  onSaved: () => void;
  onClose: () => void;
};

// Ten sam formularz co przy dodawaniu, bez kroku z wyszukiwarka - lek jest juz wybrany.
export function EditMedicationDialog({
  medication,
  draft,
  onChange,
  onReplace,
  onSaved,
  onClose,
}: EditMedicationDialogProps) {
  const revalidator = useRevalidator();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Szkic trzyma wybrany lek, ale przy edycji to zawsze ten zapisany.
  const picked = draft.medication ?? {
    ean: medication.gtin,
    name: medication.name,
    activeSubstance: medication.activeSubstance,
    packSize: null,
    reimbursement: medication.reimbursement,
  };

  function save(): void {
    setSaving(true);
    setError(null);
    updateUserMedication(medication.id, draftToRequest(draft, picked))
      .then(() => {
        void revalidator.revalidate();
        onSaved();
      })
      .catch(() => {
        setError("Nie udało się zapisać zmian. Spróbuj ponownie.");
        setSaving(false);
      });
  }

  return (
    <Modal title={`Edytuj: ${medication.name}`} onClose={onClose}>
      <MedicationForm
        medication={picked}
        draft={draft}
        saving={saving}
        error={error}
        onChange={onChange}
        onSubmit={save}
        onReset={() => onReplace(draftFromMedication(medication))}
        submitLabel="Zapisz zmiany"
        resetLabel="Przywróć zapisane"
      />
    </Modal>
  );
}
