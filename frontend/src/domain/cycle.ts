import { z } from 'zod'

export const DEFAULT_CYCLE_LENGTH_DAYS = 28
export const MIN_CYCLE_LENGTH_DAYS = 21
export const MAX_CYCLE_LENGTH_DAYS = 40

export const CYCLE_STEP_AGE_RANGE = { from: 15, to: 55 }

export const cycleProfileSchema = z.object({
  lastPeriodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  averageCycleLength: z
    .number()
    .int()
    .min(MIN_CYCLE_LENGTH_DAYS)
    .max(MAX_CYCLE_LENGTH_DAYS)
    .default(DEFAULT_CYCLE_LENGTH_DAYS),
})

export type CycleProfile = z.infer<typeof cycleProfileSchema>
