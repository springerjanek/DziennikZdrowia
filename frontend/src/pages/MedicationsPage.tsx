import { useState } from "react";
import { useLoaderData } from "react-router";
import type { UserMedication } from "@/domain";
import { MedicationList } from "@/features/medications/MedicationList";
import { AddMedicationDialog } from "@/features/medications/AddMedicationDialog";
import { EditMedicationDialog } from "@/features/medications/EditMedicationDialog";
import {
  draftFromMedication,
  emptyMedicationDraft,
  type MedicationDraft,
} from "@/features/medications/draft";
import {
  clearMedicationDraft,
  loadMedicationDraft,
  saveMedicationDraft,
} from "@/lib/draftStorage";
import type { medicationsLoader } from "./medicationsLoader";

type Editing = {
  medication: UserMedication;
  draft: MedicationDraft;
};

export function MedicationsPage() {
  const { medications, entitlements } =
    useLoaderData<typeof medicationsLoader>();
  const [adding, setAdding] = useState(false);
  // Szkic zyje tutaj, a nie w okienku, wiec zamkniecie modala niczego nie kasuje.
  // Zapis w localStorage dokłada do tego odswiezenie strony i zmiane zakladki.
  const [draft, setDraft] = useState<MedicationDraft>(loadMedicationDraft);
  // Zmiany w edytowanym leku tez przezywaja zamkniecie okienka, ale tylko do konca
  // sesji - w razie czego oryginal i tak siedzi na serwerze.
  const [editing, setEditing] = useState<Editing | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  function updateDraft(changes: Partial<MedicationDraft>) {
    const next = { ...draft, ...changes };
    setDraft(next);
    saveMedicationDraft(next);
  }

  function resetDraft() {
    setDraft(emptyMedicationDraft());
    clearMedicationDraft();
  }

  function startEdit(medication: UserMedication) {
    if (editing === null || editing.medication.id !== medication.id) {
      setEditing({ medication, draft: draftFromMedication(medication) });
    }
    setEditOpen(true);
  }

  function updateEditDraft(changes: Partial<MedicationDraft>) {
    if (editing !== null) {
      setEditing({ ...editing, draft: { ...editing.draft, ...changes } });
    }
  }

  function replaceEditDraft(next: MedicationDraft) {
    if (editing !== null) {
      setEditing({ ...editing, draft: next });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">Twoje leki</h1>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-11 items-center rounded-field bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {draft.medication === null ? "Dodaj lek" : "Dokończ dodawanie"}
        </button>
      </div>

      <MedicationList
        medications={medications}
        entitlements={entitlements}
        onEdit={startEdit}
      />

      {adding && (
        <AddMedicationDialog
          medications={medications}
          draft={draft}
          onChange={updateDraft}
          onReset={resetDraft}
          onClose={() => setAdding(false)}
        />
      )}

      {editOpen && editing !== null && (
        <EditMedicationDialog
          medication={editing.medication}
          draft={editing.draft}
          onChange={updateEditDraft}
          onReplace={replaceEditDraft}
          onSaved={() => {
            setEditing(null);
            setEditOpen(false);
          }}
          onClose={() => setEditOpen(false)}
        />
      )}
    </section>
  );
}
