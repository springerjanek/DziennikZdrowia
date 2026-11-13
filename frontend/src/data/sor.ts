import { z } from "zod";
import { apiJson } from "@/lib/api";

// Backend liczy odleglosc i opisuje obciazenie po polsku, wiec front dostaje
// gotowe teksty, a nie surowe liczby do interpretacji.
const sorHospitalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string(),
  distanceKm: z.number(),
  waitMinutes: z.number().nullable(),
  totalPatients: z.number().nullable(),
  loadCategory: z.string().nullable(),
  freshness: z.string().nullable(),
});

export type SorHospital = z.infer<typeof sorHospitalSchema>;

const nearestSorSchema = z.object({
  hospitals: z.array(sorHospitalSchema),
  fetchedAt: z.string(),
});

export type NearestSor = z.infer<typeof nearestSorSchema>;

// Ostatni wynik na czas tej wizyty w aplikacji. Zmiana zakladki odmontowuje
// strone, a bez tego powrot na nia znaczylby ponowne pytanie o lokalizacje i
// kolejne zapytanie do kolejkisor.pl, gdzie darmowy plan ma 50 na dobe.
// Swiadomie trzymamy tylko wynik, nigdy wspolrzednych, i tylko w pamieci -
// po odswiezeniu strony zaczynamy od zera.
let lastResult: NearestSor | null = null;

export function lastNearestSor(): NearestSor | null {
  return lastResult;
}

export async function fetchNearestSor(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<NearestSor> {
  lastResult = await apiJson(
    `/api/sor/nearest?lat=${lat}&lon=${lon}`,
    nearestSorSchema,
    { signal },
  );
  return lastResult;
}
