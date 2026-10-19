import { z } from 'zod'

// Kody zweryfikowane na API NFZ 18.10.2026. To nie są kody TERYT.
export const voivodeshipCodeSchema = z.enum([
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
])

export type VoivodeshipCode = z.infer<typeof voivodeshipCodeSchema>

export type Voivodeship = {
  code: VoivodeshipCode
  name: string
}

export const VOIVODESHIPS: Voivodeship[] = [
  { code: '01', name: 'dolnośląskie' },
  { code: '02', name: 'kujawsko-pomorskie' },
  { code: '03', name: 'lubelskie' },
  { code: '04', name: 'lubuskie' },
  { code: '05', name: 'łódzkie' },
  { code: '06', name: 'małopolskie' },
  { code: '07', name: 'mazowieckie' },
  { code: '08', name: 'opolskie' },
  { code: '09', name: 'podkarpackie' },
  { code: '10', name: 'podlaskie' },
  { code: '11', name: 'pomorskie' },
  { code: '12', name: 'śląskie' },
  { code: '13', name: 'świętokrzyskie' },
  { code: '14', name: 'warmińsko-mazurskie' },
  { code: '15', name: 'wielkopolskie' },
  { code: '16', name: 'zachodniopomorskie' },
]

export const locationSchema = z.object({
  voivodeship: voivodeshipCodeSchema,
  locality: z.string().min(1).max(120),
})

export type Location = z.infer<typeof locationSchema>

export function voivodeshipName(code: VoivodeshipCode): string {
  for (const voivodeship of VOIVODESHIPS) {
    if (voivodeship.code === code) {
      return voivodeship.name
    }
  }
  return code
}
