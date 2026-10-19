import { z } from "zod";
//ZWROTY KOSZTOW
// S = 65+, DZ = do 18 lat, C = ciąża
export const entitlementCodeSchema = z.enum(["S", "DZ", "C"]);

export type EntitlementCode = z.infer<typeof entitlementCodeSchema>;

export const reimbursementLevelSchema = z.enum([
  "free",
  "flat_rate",
  "p30",
  "p50",
  "full",
]);

export type ReimbursementLevel = z.infer<typeof reimbursementLevelSchema>;

export const reimbursementSchema = z.object({
  level: reimbursementLevelSchema,
  freeFor: z.array(entitlementCodeSchema).default([]),
  announcementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type Reimbursement = z.infer<typeof reimbursementSchema>;

export const medicationSchema = z.object({
  ean: z
    .string()
    .regex(/^\d{8,14}$/)
    .optional(),
  name: z.string().min(1),
  activeSubstance: z.string().min(1).optional(),
  atc: z
    .string()
    .regex(/^[A-Z]\d{2}[A-Z]{2}\d{2}$/)
    .optional(),
  reimbursement: reimbursementSchema.optional(),
});

export type Medication = z.infer<typeof medicationSchema>;

export const medicationUsageSchema = z.enum(["regular", "recent"]);

export type MedicationUsage = z.infer<typeof medicationUsageSchema>;

export const medicationEntrySchema = z.object({
  medication: medicationSchema,
  usage: medicationUsageSchema,
});

export type MedicationEntry = z.infer<typeof medicationEntrySchema>;

export function qualifiesForFree(
  medication: Medication,
  userEntitlements: EntitlementCode[],
): boolean {
  const freeFor = medication.reimbursement?.freeFor;
  if (!freeFor) {
    return false;
  }

  for (const code of userEntitlements) {
    if (freeFor.includes(code)) {
      return true;
    }
  }
  return false;
}

export function reimbursementLabel(level: ReimbursementLevel): string {
  switch (level) {
    case "free":
      return "bezpłatny";
    case "flat_rate":
      return "stała opłata";
    case "p30":
      return "płacisz 30%";
    case "p50":
      return "płacisz 50%";
    case "full":
      return "pełna cena";
  }
}
