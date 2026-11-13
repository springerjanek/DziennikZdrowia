import { searchMedications } from "@/data/medications";
import { fetchProfile } from "@/data/profile";
import { fetchUserMedications } from "@/data/userMedications";
import {
  findSavings,
  savedEntitlements,
  type EntitlementCode,
  type Medication,
  type Savings,
  type UserMedication,
} from "@/domain";
import { redirectOnUnauthorized } from "@/lib/redirectOnUnauthorized";

export type MedicationsData = {
  medications: UserMedication[];
  // Uprawnienia lekowe uzytkownika: 65+ albo ponizej 18 lat. Wykaz podaje, komu
  // lek przysluguje bezplatnie, wiec bez tego karta mowilaby o cudzych pieniadzach.
  entitlements: EntitlementCode[];
  // Tansza opcja per lek, kluczowana id wpisu uzytkownika.
  savings: Record<string, Savings>;
};

function unique(candidates: Medication[]): Medication[] {
  const byKey = new Map<string, Medication>();
  for (const candidate of candidates) {
    byKey.set(candidate.ean ?? candidate.name, candidate);
  }
  return [...byKey.values()];
}

// Dwa zapytania: po pelnej nazwie wracaja opakowania tego samego leku w tej samej
// dawce, po substancji - zamienniki innych producentow. Backend nie wystawia
// szukania po ATC, a UserMedication nie niesie ani packSize, ani atc.
async function findFor(
  medication: UserMedication,
  signal: AbortSignal,
): Promise<[string, Savings] | null> {
  if (medication.gtin === null) {
    return null;
  }
  const queries = [medication.name];
  if (medication.activeSubstance !== null) {
    queries.push(medication.activeSubstance);
  }
  try {
    const results = await Promise.all(
      queries.map((query) => searchMedications(query, signal)),
    );
    const savings = findSavings(medication, unique(results.flat()));
    return savings === null ? null : [medication.id, savings];
  } catch {
    // Podpowiedz o cenie jest dodatkiem - jej brak nie moze wywalic listy lekow.
    return null;
  }
}

export async function medicationsLoader({
  request,
}: {
  request: Request;
}): Promise<MedicationsData> {
  const [medications, profile] = await Promise.all([
    fetchUserMedications(),
    fetchProfile(),
  ]).catch(redirectOnUnauthorized);

  const found = await Promise.all(
    medications.map((medication) => findFor(medication, request.signal)),
  );

  return {
    medications,
    entitlements: savedEntitlements(profile.birthYear, profile.birthMonth),
    savings: Object.fromEntries(found.filter((entry) => entry !== null)),
  };
}
