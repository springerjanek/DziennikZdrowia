import type { EntitlementCode, UserMedication } from "@/domain";
import { MedicationCard } from "./MedicationCard";

type Props = {
  medications: UserMedication[];
  entitlements: EntitlementCode[];
  onEdit: (medication: UserMedication) => void;
};

export function MedicationList({ medications, entitlements, onEdit }: Props) {
  if (medications.length === 0) {
    return <p className="text-slate-600">Nie masz tu jeszcze żadnych leków.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {medications.map((medication) => (
        <MedicationCard
          key={medication.id}
          medication={medication}
          entitlements={entitlements}
          onEdit={() => onEdit(medication)}
        />
      ))}
    </ul>
  );
}
