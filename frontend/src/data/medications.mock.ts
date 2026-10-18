import type { Medication } from "@/domain";

const PLACEHOLDER_ANNOUNCEMENT = "2026-10-01";

export const MOCK_MEDICATIONS: Medication[] = [
  { name: "Metformax 500", activeSubstance: "Metformina", atc: "A10BA02", reimbursement: { level: "flat_rate", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Glucophage XR", activeSubstance: "Metformina", atc: "A10BA02", reimbursement: { level: "flat_rate", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Siofor 1000", activeSubstance: "Metformina", atc: "A10BA02", reimbursement: { level: "p30", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Euthyrox N", activeSubstance: "Lewotyroksyna sodowa", atc: "H03AA01", reimbursement: { level: "flat_rate", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Letrox", activeSubstance: "Lewotyroksyna sodowa", atc: "H03AA01", reimbursement: { level: "flat_rate", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Concor", activeSubstance: "Bisoprolol", atc: "C07AB07", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Bisocard", activeSubstance: "Bisoprolol", atc: "C07AB07", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Tritace", activeSubstance: "Ramipryl", atc: "C09AA05", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Amlozek", activeSubstance: "Amlodypina", atc: "C08CA01", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Tertensif SR", activeSubstance: "Indapamid", atc: "C03BA11", reimbursement: { level: "p30", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Furosemid Polfarmex", activeSubstance: "Furosemid", atc: "C03CA01", reimbursement: { level: "flat_rate", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Atoris", activeSubstance: "Atorwastatyna", atc: "C10AA05", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Sortis", activeSubstance: "Atorwastatyna", atc: "C10AA05", reimbursement: { level: "p30", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Crestor", activeSubstance: "Rozuwastatyna", atc: "C10AA07", reimbursement: { level: "p50", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Acard", activeSubstance: "Kwas acetylosalicylowy", atc: "B01AC06", reimbursement: { level: "full", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Polocard", activeSubstance: "Kwas acetylosalicylowy", atc: "B01AC06", reimbursement: { level: "full", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Xarelto", activeSubstance: "Rywaroksaban", atc: "B01AF01", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Controloc", activeSubstance: "Pantoprazol", atc: "A02BC02", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Polprazol", activeSubstance: "Omeprazol", atc: "A02BC01", reimbursement: { level: "p30", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Ventolin", activeSubstance: "Salbutamol", atc: "R03AC02", reimbursement: { level: "p30", freeFor: ["S", "DZ"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Symbicort Turbuhaler", activeSubstance: "Budezonid + formoterol", atc: "R03AK07", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Berodual N", activeSubstance: "Fenoterol + ipratropium", atc: "R03AL01", reimbursement: { level: "p30", freeFor: ["S"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Lantus", activeSubstance: "Insulina glargine", atc: "A10AE04", reimbursement: { level: "flat_rate", freeFor: ["S", "DZ"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "NovoRapid", activeSubstance: "Insulina aspart", atc: "A10AB05", reimbursement: { level: "flat_rate", freeFor: ["S", "DZ"], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Escitil", activeSubstance: "Escitalopram", atc: "N06AB10", reimbursement: { level: "p30", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Asentra", activeSubstance: "Sertralina", atc: "N06AB06", reimbursement: { level: "p30", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Ibuprom", activeSubstance: "Ibuprofen", atc: "M01AE01", reimbursement: { level: "full", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
  { name: "Apap", activeSubstance: "Paracetamol", atc: "N02BE01", reimbursement: { level: "full", freeFor: [], announcementDate: PLACEHOLDER_ANNOUNCEMENT } },
];

export function searchMedications(query: string, limit = 8): Medication[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }

  const results: Medication[] = [];
  for (const medication of MOCK_MEDICATIONS) {
    const haystack = `${medication.name} ${medication.activeSubstance ?? ""}`;
    if (haystack.toLowerCase().includes(needle)) {
      results.push(medication);
    }
    if (results.length === limit) {
      break;
    }
  }
  return results;
}
