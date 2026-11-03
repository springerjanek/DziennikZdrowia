import { z } from "zod";
import { medicationSchema, type Medication } from "@/domain";
import { apiJson } from "@/lib/api";

// Tyle samo, ile wymaga backend - nie ma sensu pytac o krotsze.
export const MIN_QUERY_LENGTH = 2;

const RESULT_LIMIT = 20;

const searchResultsSchema = z.array(medicationSchema);

// Endpoint jest publiczny, bo wyszukiwarka dziala w onboardingu, przed logowaniem.
export function searchMedications(
  query: string,
  signal: AbortSignal,
): Promise<Medication[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(RESULT_LIMIT),
  });
  return apiJson(`/api/medications/search?${params}`, searchResultsSchema, {
    signal,
  });
}
