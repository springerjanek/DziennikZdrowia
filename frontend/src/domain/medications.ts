import { z } from "zod";

// S = 65+, DZ = do 18 lat, C = ciąża
export const entitlementCodeSchema = z.enum(["S", "DZ", "C"]);

export type EntitlementCode = z.infer<typeof entitlementCodeSchema>;

export const reimbursementLevelSchema = z.enum([
  "free",
  "flat_rate",
  "p30",
  "p50",
  "full",
]);

export type ReimbursementLevel = z.infer<typeof reimbursementLevelSchema>;

// Ten sam lek bywa refundowany inaczej w różnych chorobach.
export const indicationSchema = z.object({
  text: z.string(),
  level: reimbursementLevelSchema,
  patientSurcharge: z.number().nullable(),
  // Cena detaliczna opakowania z obwieszczenia; null dla lekow spoza wykazu.
  retailPrice: z.number().nullable(),
});

export type Indication = z.infer<typeof indicationSchema>;

export const reimbursementSchema = z.object({
  level: reimbursementLevelSchema,
  freeFor: z.array(entitlementCodeSchema),
  announcementDate: z.string().nullable(),
  indications: z.array(indicationSchema),
});

export type Reimbursement = z.infer<typeof reimbursementSchema>;

// Odpowiada MedicationSearchResult z backendu. Leki spoza wykazu MZ
// przychodzą z NFZ i mają tylko nazwę - reszta pól jest wtedy pusta.
export const medicationSchema = z.object({
  ean: z.string().nullable(),
  name: z.string().min(1),
  activeSubstance: z.string().nullable(),
  packSize: z.string().nullable(),
  retailPrice: z.number().nullable(),
  // Kod ATC z Rejestru Produktow Leczniczych. Nie pokazujemy go uzytkownikowi -
  // posluzy do szukania zamiennikow przy lekach zlozonych.
  atc: z.string().nullable(),
  reimbursement: reimbursementSchema,
});

export type Medication = z.infer<typeof medicationSchema>;

export const medicationUsageSchema = z.enum(["regular", "recent"]);

export type MedicationUsage = z.infer<typeof medicationUsageSchema>;

export const medicationEntrySchema = z.object({
  medication: medicationSchema,
  usage: medicationUsageSchema,
});

export type MedicationEntry = z.infer<typeof medicationEntrySchema>;

// Lek bez EAN-u rozróżniamy po nazwie: tak przychodzą wyniki z NFZ
// i tak dodaje je użytkownik, gdy wyszukiwarka nic nie znajdzie.
export function medicationKey(medication: Medication): string {
  return medication.ean ?? medication.name;
}

// Lek spoza wykazu MZ: pełna cena, bez uprawnień.
export function manualMedication(name: string): Medication {
  return {
    ean: null,
    name: name.trim(),
    activeSubstance: null,
    packSize: null,
    retailPrice: null,
    atc: null,
    reimbursement: {
      level: "full",
      freeFor: [],
      announcementDate: null,
      indications: [],
    },
  };
}

export function qualifiesForFree(
  medication: Medication,
  userEntitlements: EntitlementCode[],
): boolean {
  for (const code of userEntitlements) {
    if (medication.reimbursement.freeFor.includes(code)) {
      return true;
    }
  }
  return false;
}

// Wykaz MZ ma osobna pozycje dla kazdego opakowania, wiec jedno zapytanie potrafi
// zwrocic kilkanascie wierszy tego samego leku. Nazwa z backendu zawiera postac i dawke
// ("Metformax SR 1000, tabl. o przedl. uwalnianiu, 1000 mg"), wiec grupowanie po niej
// nie sklei ze soba lekow, ktore roznia sie skladem - tylko same opakowania.
export type MedicationGroup = {
  name: string;
  activeSubstance: string | null;
  options: Medication[];
};

// "30 szt." -> 30, "5 wkl. po 3 ml" -> 5. Pierwsza liczba to zawsze liczba sztuk
// w opakowaniu. Opakowania bez liczby ida na koniec.
function packUnits(medication: Medication): number {
  const digits = medication.packSize?.match(/\d+/) ?? null;
  return digits === null ? Number.MAX_SAFE_INTEGER : Number(digits[0]);
}

// Ten sam lek ma inna doplate w kazdym opakowaniu, a bywa ze i w kazdym wskazaniu.
function surcharges(medication: Medication): number[] {
  return medication.reimbursement.indications
    .map((indication) => indication.patientSurcharge)
    .filter((amount) => amount !== null);
}

// Wykaz miewa dwa wpisy o tej samej wielkosci opakowania i tej samej cenie (rozni wytworcy,
// rozny EAN). Nie pokazujemy wytworcy, wiec dla uzytkownika to ten sam wybor w dwoch wierszach.
function withoutIdenticalPacks(options: Medication[]): Medication[] {
  const seen = new Set<string>();
  const unique: Medication[] = [];
  for (const option of options) {
    const prices = surcharges(option)
      .sort((first, second) => first - second)
      .join(",");
    const key = `${option.packSize}|${prices}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(option);
    }
  }
  return unique;
}

export function groupByName(medications: Medication[]): MedicationGroup[] {
  // Map zachowuje kolejnosc wstawiania, wiec ranking z backendu zostaje nienaruszony.
  const groups = new Map<string, MedicationGroup>();
  for (const medication of medications) {
    const existing = groups.get(medication.name);
    if (existing === undefined) {
      groups.set(medication.name, {
        name: medication.name,
        activeSubstance: medication.activeSubstance,
        options: [medication],
      });
    } else {
      existing.options.push(medication);
    }
  }
  // Opakowania rosnaco; sort jest stabilny, wiec rowne wielkosci zostaja w kolejnosci z backendu.
  for (const group of groups.values()) {
    group.options.sort((first, second) => packUnits(first) - packUnits(second));
    group.options = withoutIdenticalPacks(group.options);
  }
  return [...groups.values()];
}

export function entitlementLabel(code: EntitlementCode): string {
  switch (code) {
    case "S":
      return "osób po 65. roku życia";
    case "DZ":
      return "osób do 18. roku życia";
    case "C":
      return "kobiet w ciąży";
  }
}

export function formatZloty(amount: number): string {
  return amount.toLocaleString("pl-PL", { minimumFractionDigits: 2 });
}

export function formatSurcharge(medications: Medication[]): string | null {
  const amounts = medications.flatMap(surcharges);
  if (amounts.length === 0) {
    return null;
  }
  const lowest = Math.min(...amounts);
  const highest = Math.max(...amounts);
  if (lowest === highest) {
    return `${formatZloty(lowest)} zł`;
  }
  return `${formatZloty(lowest)}–${formatZloty(highest)} zł`;
}

// Jedno opakowanie bywa refundowane inaczej w roznych chorobach - wtedy "od", bo ktora
// kwota obowiazuje, zalezy od diagnozy. Zakres przy jednym pudelku wygladalby jak niepewnosc ceny.
export function formatPackSurcharge(medication: Medication): string | null {
  const amounts = surcharges(medication);
  if (amounts.length === 0) {
    return null;
  }
  const lowest = Math.min(...amounts);
  return amounts.some((amount) => amount !== lowest)
    ? `od ${formatZloty(lowest)} zł`
    : `${formatZloty(lowest)} zł`;
}

// Ile opakowanie kosztowaloby bez refundacji. Pokazujemy to tylko wtedy, gdy
// refundacja faktycznie obniza cene - inaczej "zamiast" nie ma czego przeciwstawic.
export function formatPackSaving(medication: Medication): string | null {
  const price = medication.retailPrice;
  const amounts = surcharges(medication);
  if (price === null || amounts.length === 0) {
    return null;
  }
  return price > Math.min(...amounts) ? `${formatZloty(price)} zł` : null;
}

// Gotowe zdanie o koszcie leku juz zapisanego: tam cena siedzi tylko przy
// wskazaniach, bo zalezy od tego, na co lek jest brany.
export function formatReimbursementCost(
  reimbursement: Reimbursement,
): string | null {
  const prices = reimbursement.indications
    .map((indication) => indication.retailPrice)
    .filter((price) => price !== null);
  const amounts = reimbursement.indications
    .map((indication) => indication.patientSurcharge)
    .filter((amount) => amount !== null);
  if (amounts.length === 0) {
    return null;
  }
  const surcharge = Math.min(...amounts);
  const price = prices.length === 0 ? null : Math.min(...prices);
  return price !== null && price > surcharge
    ? `zapłacisz ${formatZloty(surcharge)} zł zamiast ${formatZloty(price)} zł`
    : `zapłacisz ${formatZloty(surcharge)} zł`;
}

export function packCountLabel(count: number): string {
  if (count === 1) {
    return "1 opakowanie";
  }
  // Polska liczba mnoga: koncowka 2-4 bierze "opakowania", poza nastolatkami (12-14).
  const lastDigit = count % 10;
  const teens = count % 100 >= 12 && count % 100 <= 14;
  return lastDigit >= 2 && lastDigit <= 4 && !teens
    ? `${count} opakowania`
    : `${count} opakowań`;
}

export function reimbursementLabel(level: ReimbursementLevel): string {
  switch (level) {
    case "free":
      return "bezpłatny";
    case "flat_rate":
      return "stała opłata";
    case "p30":
      return "płacisz 30%";
    case "p50":
      return "płacisz 50%";
    case "full":
      return "pełna cena";
  }
}

// Wykaz ma 14-znakowy GTIN, a na pudelku wydrukowane jest 13 cyfr kodu EAN.
export function formatEan(ean: string): string {
  return ean.length === 14 && ean.startsWith("0") ? ean.slice(1) : ean;
}

// Ten sam lek potrafi miec w wykazie dwa wpisy o identycznej wielkosci opakowania,
// rozne tylko kodem i cena. Obwieszczenie nie podaje producenta, wiec jedyne,
// co user moze porownac z pudelkiem, to kod EAN.
export function needsEanToTellApart(
  options: Medication[],
  option: Medication,
): boolean {
  return options.some(
    (other) => other !== option && other.packSize === option.packSize,
  );
}
