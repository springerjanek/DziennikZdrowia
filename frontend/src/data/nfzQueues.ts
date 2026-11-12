import { z } from "zod";
import type { VoivodeshipCode } from "@/domain";

// API NFZ "terminy leczenia": bez klucza i z otwartym CORS, wiec front wola je
// sam. To jedyne zrodlo danych w aplikacji, ktore nie idzie przez nasz backend.
const BASE = "https://api.nfz.gov.pl/app-itl-api/queues";

// Statystyki bywaja puste, a adres niekompletny - wiekszosc pol musi byc opcjonalna.
const providerDataSchema = z.object({
  "average-period": z.number().nullable(),
  awaiting: z.number().nullable(),
  update: z.string().nullable(),
});

const attributesSchema = z.object({
  provider: z.string(),
  place: z.string().nullable(),
  address: z.string().nullable(),
  locality: z.string().nullable(),
  phone: z.string().nullable(),
  "car-park": z.string().nullable(),
  elevator: z.string().nullable(),
  ramp: z.string().nullable(),
  toilet: z.string().nullable(),
  statistics: z
    .object({ "provider-data": providerDataSchema.nullable() })
    .nullable(),
});

const queuesSchema = z.object({
  data: z.array(z.object({ attributes: attributesSchema })),
});

export type NfzQueue = {
  key: string;
  provider: string;
  place: string | null;
  address: string | null;
  locality: string | null;
  phone: string | null;
  waitDays: number | null;
  awaiting: number | null;
  accessible: string[];
};

export class NfzBusyError extends Error {}

const ACCESS_FIELDS = {
  elevator: "winda",
  ramp: "podjazd",
  "car-park": "parking",
  toilet: "toaleta dla osób z niepełnosprawnością",
} as const;

export async function fetchNfzQueues(
  benefit: string,
  province: VoivodeshipCode,
  signal?: AbortSignal,
): Promise<NfzQueue[]> {
  const query = new URLSearchParams({
    benefit,
    // 1 = przypadek stabilny, czyli planowe badanie profilaktyczne.
    case: "1",
    province,
    format: "json",
    "api-version": "1.3",
    limit: "25",
    page: "1",
  });

  const response = await fetch(`${BASE}?${query.toString()}`, { signal });
  // NFZ ogranicza liczbe zapytan - to nie jest awaria, tylko prosba o chwile przerwy.
  if (response.status === 429) {
    throw new NfzBusyError();
  }
  if (!response.ok) {
    throw new Error(`NFZ HTTP ${response.status}`);
  }

  const parsed = queuesSchema.parse(await response.json());
  const queues = parsed.data.map(({ attributes }, index) => {
    const stats = attributes.statistics?.["provider-data"] ?? null;
    const accessible = Object.entries(ACCESS_FIELDS)
      .filter(([field]) => attributes[field as keyof typeof ACCESS_FIELDS] === "Y")
      .map(([, label]) => label);

    return {
      key: `${attributes.provider}-${index}`,
      provider: attributes.provider,
      place: attributes.place,
      address: attributes.address,
      locality: attributes.locality,
      phone: attributes.phone,
      waitDays: stats?.["average-period"] ?? null,
      awaiting: stats?.awaiting ?? null,
      accessible,
    };
  });

  // Najkrotsze oczekiwanie na gorze; kolejki bez danych na koncu.
  return queues.sort(
    (first, second) =>
      (first.waitDays ?? Number.MAX_SAFE_INTEGER) -
      (second.waitDays ?? Number.MAX_SAFE_INTEGER),
  );
}
