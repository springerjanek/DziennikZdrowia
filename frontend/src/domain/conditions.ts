import { z } from 'zod'

export const chronicConditionIdSchema = z.enum([
  'hypertension',
  'diabetes_t2',
  'diabetes_t1',
  'hypothyroidism',
  'hyperthyroidism',
  'asthma',
  'copd',
  'hyperlipidemia',
  'ihd',
  'ckd',
  'depression',
  'ibd',
  'osteoporosis',
  'migraine',
])

export type ChronicConditionId = z.infer<typeof chronicConditionIdSchema>

export type ChronicCondition = {
  id: ChronicConditionId
  label: string
  icd10: string
}

export const CHRONIC_CONDITIONS: ChronicCondition[] = [
  { id: 'hypertension', label: 'Nadciśnienie tętnicze', icd10: 'I10' },
  { id: 'diabetes_t2', label: 'Cukrzyca typu 2', icd10: 'E11' },
  { id: 'diabetes_t1', label: 'Cukrzyca typu 1', icd10: 'E10' },
  { id: 'hypothyroidism', label: 'Niedoczynność tarczycy', icd10: 'E03' },
  { id: 'hyperthyroidism', label: 'Nadczynność tarczycy', icd10: 'E05' },
  { id: 'asthma', label: 'Astma', icd10: 'J45' },
  { id: 'copd', label: 'POChP', icd10: 'J44' },
  { id: 'hyperlipidemia', label: 'Zaburzenia lipidowe', icd10: 'E78' },
  { id: 'ihd', label: 'Choroba niedokrwienna serca', icd10: 'I25' },
  { id: 'ckd', label: 'Przewlekła choroba nerek', icd10: 'N18' },
  { id: 'depression', label: 'Depresja', icd10: 'F32' },
  { id: 'ibd', label: 'Choroba zapalna jelit', icd10: 'K51' },
  { id: 'osteoporosis', label: 'Osteoporoza', icd10: 'M81' },
  { id: 'migraine', label: 'Migrena', icd10: 'G43' },
]

export function conditionLabel(id: ChronicConditionId): string {
  for (const condition of CHRONIC_CONDITIONS) {
    if (condition.id === id) {
      return condition.label
    }
  }
  return id
}
