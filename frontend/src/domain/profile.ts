import { z } from 'zod'
import { chronicConditionIdSchema } from './conditions'
import { cycleProfileSchema, CYCLE_STEP_AGE_RANGE } from './cycle'
import { locationSchema } from './geo'
import { medicationEntrySchema, type EntitlementCode } from './medications'

export const sexSchema = z.enum(['female', 'male'])

export type Sex = z.infer<typeof sexSchema>

export const birthDateSchema = z.object({
  year: z.number().int().min(1900).max(new Date().getFullYear()),
  month: z.number().int().min(1).max(12),
})

export type BirthDate = z.infer<typeof birthDateSchema>

export const reminderPrefsSchema = z.object({
  email: z.boolean().default(true),
  timeOfDay: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('09:00'),
  daysBefore: z.number().int().min(0).max(90).default(7),
})

export type ReminderPrefs = z.infer<typeof reminderPrefsSchema>

export const consentsSchema = z.object({
  healthDataProcessing: z.boolean(),
  cycleTracking: z.boolean().default(false),
})

export type Consents = z.infer<typeof consentsSchema>

export const healthProfileSchema = z.object({
  birthDate: birthDateSchema,
  sex: sexSchema,
  location: locationSchema.nullable().default(null),
  conditions: z.array(chronicConditionIdSchema).default([]),
  medications: z.array(medicationEntrySchema).default([]),
  cycle: cycleProfileSchema.nullable().default(null),
  reminders: reminderPrefsSchema,
  consents: consentsSchema,
})

export type HealthProfile = z.infer<typeof healthProfileSchema>

// Programy NFZ liczą wiek rocznikowo.
export function ageByYear(birth: BirthDate, today = new Date()): number {
  return today.getFullYear() - birth.year
}

// Uprawnienia lekowe liczą ukończone lata.
export function ageInYearsCompleted(birth: BirthDate, today = new Date()): number {
  const yearsPassed = today.getFullYear() - birth.year
  const monthsPassed = today.getMonth() + 1 - birth.month
  const totalMonths = yearsPassed * 12 + monthsPassed
  return Math.floor(totalMonths / 12)
}

export function entitlements(
  profile: HealthProfile,
  today = new Date(),
): EntitlementCode[] {
  const age = ageInYearsCompleted(profile.birthDate, today)
  const codes: EntitlementCode[] = []

  if (age >= 65) {
    codes.push('S')
  }
  if (age < 18) {
    codes.push('DZ')
  }
  return codes
}

export function shouldAskAboutCycle(
  profile: HealthProfile,
  today = new Date(),
): boolean {
  if (profile.sex !== 'female') {
    return false
  }

  const age = ageByYear(profile.birthDate, today)
  return age >= CYCLE_STEP_AGE_RANGE.from && age <= CYCLE_STEP_AGE_RANGE.to
}
