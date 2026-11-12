import { z } from "zod";
import type { VoivodeshipCode } from "@/domain";
import { NfzBusyError } from "./nfzQueues";

// API NFZ "umowy": kto ma kontrakt na jaki rodzaj swiadczen. Bez klucza i z
// otwartym CORS, tak jak "terminy leczenia", wiec front wola je sam.
const BASE = "https://api.nfz.gov.pl/app-umw-api/agreements";

// 01 = podstawowa opieka zdrowotna, czyli przychodnie rodzinne.
const PRIMARY_CARE = "01";
// Wiecej niz 25 na strone API odrzuca bledem.
const PAGE_SIZE = 25;

const agreementsSchema = z.object({
  meta: z.object({ count: z.number() }),
  // Przy braku wynikow NFZ oddaje "data": null, a nie pusta liste.
  data: z
    .object({
      agreements: z.array(
        z.object({
          attributes: z.object({
            "provider-code": z.string(),
            "provider-name": z.string(),
            "provider-place": z.string().nullable(),
          }),
        }),
      ),
    })
    .nullable(),
});

export type PozClinic = {
  code: string;
  name: string;
  place: string | null;
};

export type PozClinics = {
  clinics: PozClinic[];
  // Ile umow NFZ ma w tej miejscowosci lacznie - pobieramy tylko pierwsza strone.
  total: number;
};

// Umowe na POZ maja tez samodzielne praktyki pielegniarek i poloznych. Bilansu
// zdrowia ani skierowania na badania tam sie nie dostanie, wiec je pomijamy.
function isNursingPractice(name: string): boolean {
  return /PRAKTYKA\s+(PIELĘGNIAR|POŁOŻN)/i.test(name);
}

export async function fetchPozClinics(
  province: VoivodeshipCode,
  place: string,
  signal?: AbortSignal,
): Promise<PozClinics> {
  const query = new URLSearchParams({
    year: String(new Date().getFullYear()),
    branch: province,
    serviceType: PRIMARY_CARE,
    place,
    limit: String(PAGE_SIZE),
    page: "1",
    format: "json",
    "api-version": "1.2",
  });

  const response = await fetch(`${BASE}?${query.toString()}`, { signal });
  if (response.status === 429) {
    throw new NfzBusyError();
  }
  if (!response.ok) {
    throw new Error(`NFZ HTTP ${response.status}`);
  }

  const parsed = agreementsSchema.parse(await response.json());

  // Jedna placowka potrafi miec kilka umow - na liscie ma byc raz.
  const byCode = new Map<string, PozClinic>();
  for (const { attributes } of parsed.data?.agreements ?? []) {
    if (!isNursingPractice(attributes["provider-name"])) {
      byCode.set(attributes["provider-code"], {
        code: attributes["provider-code"],
        name: attributes["provider-name"],
        place: attributes["provider-place"],
      });
    }
  }

  return {
    clinics: [...byCode.values()].sort((first, second) =>
      first.name.localeCompare(second.name, "pl"),
    ),
    total: parsed.meta.count,
  };
}
