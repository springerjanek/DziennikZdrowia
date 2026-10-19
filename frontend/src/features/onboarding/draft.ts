import { z } from "zod";
import {
  chronicConditionIdSchema,
  DEFAULT_CYCLE_LENGTH_DAYS,
  entitlements,
  evaluate,
  MAX_CYCLE_LENGTH_DAYS,
  medicationEntrySchema,
  MIN_CYCLE_LENGTH_DAYS,
  qualifiesForFree,
  sexSchema,
  type ChronicConditionId,
  voivodeshipCodeSchema,
  type HealthProfile,
  type Medication,
  type MedicationEntry,
  type MedicationUsage,
} from "@/domain";

export const onboardingDraftSchema = z.object({
  birthYear: z.number().int().min(1900).max(2100).nullable(),
  birthMonth: z.number().int().min(1).max(12).nullable(),
  sex: sexSchema.nullable(),
  voivodeship: voivodeshipCodeSchema.nullable(),
  locality: z.string().max(120),
  conditions: z.array(chronicConditionIdSchema).catch([]),
  medications: z.array(medicationEntrySchema).catch([]),
  lastPeriodStart: z.string().max(10),
  averageCycleLength: z
    .number()
    .int()
    .min(MIN_CYCLE_LENGTH_DAYS)
    .max(MAX_CYCLE_LENGTH_DAYS),
  cycleConsent: z.boolean(),
  reminderEmail: z.boolean(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  reminderDaysBefore: z.number().int().min(0).max(90),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export const emptyDraft: OnboardingDraft = {
  birthYear: null,
  birthMonth: null,
  sex: null,
  voivodeship: null,
  locality: "",
  conditions: [],
  medications: [],
  lastPeriodStart: "",
  averageCycleLength: DEFAULT_CYCLE_LENGTH_DAYS,
  cycleConsent: false,
  reminderEmail: true,
  reminderTime: "09:00",
  reminderDaysBefore: 7,
};

export function draftToProfile(draft: OnboardingDraft): HealthProfile | null {
  if (
    draft.birthYear === null ||
    draft.birthMonth === null ||
    draft.sex === null
  ) {
    return null;
  }

  const locality = draft.locality.trim();
  const cycleAllowed = draft.cycleConsent && draft.lastPeriodStart !== "";

  return {
    birthDate: { year: draft.birthYear, month: draft.birthMonth },
    sex: draft.sex,
    location:
      draft.voivodeship !== null && locality !== ""
        ? { voivodeship: draft.voivodeship, locality }
        : null,
    conditions: draft.conditions,
    medications: draft.medications,
    cycle: cycleAllowed
      ? {
          lastPeriodStart: draft.lastPeriodStart,
          averageCycleLength: draft.averageCycleLength,
        }
      : null,
    reminders: {
      email: draft.reminderEmail,
      timeOfDay: draft.reminderTime,
      daysBefore: draft.reminderDaysBefore,
    },
    consents: {
      healthDataProcessing: true,
      cycleTracking: cycleAllowed,
    },
  };
}

export function recommendationCount(draft: OnboardingDraft): number {
  const profile = draftToProfile(draft);
  if (profile === null) {
    return 0;
  }
  return evaluate(profile).length;
}

export function toggleCondition(
  conditions: ChronicConditionId[],
  id: ChronicConditionId,
): ChronicConditionId[] {
  if (conditions.includes(id)) {
    return conditions.filter((current) => current !== id);
  }
  return [...conditions, id];
}

export function addMedication(
  entries: MedicationEntry[],
  medication: Medication,
): MedicationEntry[] {
  for (const entry of entries) {
    if (entry.medication.name === medication.name) {
      return entries;
    }
  }
  return [...entries, { medication, usage: "regular" }];
}

export function removeMedication(
  entries: MedicationEntry[],
  name: string,
): MedicationEntry[] {
  return entries.filter((entry) => entry.medication.name !== name);
}

export function setMedicationUsage(
  entries: MedicationEntry[],
  name: string,
  usage: MedicationUsage,
): MedicationEntry[] {
  return entries.map((entry) =>
    entry.medication.name === name ? { ...entry, usage } : entry,
  );
}

export function countPotentiallyFreeMedications(
  draft: OnboardingDraft,
): number {
  const profile = draftToProfile(draft);
  if (profile === null) {
    return 0;
  }

  const codes = entitlements(profile);
  if (codes.length === 0) {
    return 0;
  }

  let count = 0;
  for (const entry of draft.medications) {
    if (qualifiesForFree(entry.medication, codes)) {
      count += 1;
    }
  }
  return count;
}
