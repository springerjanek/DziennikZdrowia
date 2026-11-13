import type { Medication, Reimbursement } from "./medications";
import type { UserMedication } from "./userMedications";

export type CheaperOption = {
  // "pack" to inne opakowanie tego samego leku, "substitute" to inny producent.
  kind: "pack" | "substitute";
  name: string;
  packSize: string;
  surcharge: number;
  perUnit: number;
  ean: string | null;
};

export type Savings = {
  best: CheaperOption;
  ownPerUnit: number;
  // null przy "w razie potrzeby": nie wiemy, ile tabletek zejdzie w miesiacu.
  monthlyUnits: number | null;
  monthlySaving: number | null;
};

const DAYS_IN_MONTH = 30;

// Tylko opakowania liczone w sztukach. "5 wkl.po 3 ml" albo "1 poj.po 200 daw."
// nie da sie przeliczyc na tabletke, a zgadywanie przy insulinie jest ostatnia
// rzecza, jakiej chcemy.
export function packUnits(packSize: string | null): number | null {
  if (packSize === null) {
    return null;
  }
  const match = /^(\d+)\s*szt\.?$/.exec(packSize.trim());
  return match === null ? null : Number(match[1]);
}

// Porownujemy doplate pacjenta, nie cene detaliczna - to doplate placi sie w okienku.
export function lowestSurcharge(reimbursement: Reimbursement): number | null {
  const amounts = reimbursement.indications
    .map((indication) => indication.patientSurcharge)
    .filter((amount) => amount !== null);
  return amounts.length === 0 ? null : Math.min(...amounts);
}

function perUnit(medication: Medication): number | null {
  const units = packUnits(medication.packSize);
  const surcharge = lowestSurcharge(medication.reimbursement);
  if (units === null || units === 0 || surcharge === null) {
    return null;
  }
  return surcharge / units;
}

type NameParts = {
  product: string;
  form: string;
  dose: string;
};

// Wykaz zapisuje nazwy jako "produkt, postac, dawka" - sprawdzone, trzyma sie
// tego kazda pozycja w probce ze 100 lekow.
function splitName(name: string): NameParts | null {
  const parts = name.split(", ");
  if (parts.length < 3) {
    return null;
  }
  return {
    product: parts.slice(0, -2).join(", "),
    form: parts[parts.length - 2],
    dose: parts[parts.length - 1],
  };
}

// W wykazie wystepuje i znak mikro (U+00B5), i grecka litera mi (U+03BC).
// Wygladaja identycznie, wiec bez tego "125 µg" i "125 μg" to dwie rozne dawki.
function normalizeDose(dose: string): string {
  return dose
    .replace(/μ/g, "µ")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Czy kandydat jest zamiennikiem, ktorego mozna podac zamiast oryginalu.
 * Wymagamy tego samego kodu ATC, tej samej postaci i tej samej dawki. Rozna
 * postac odpada, bo "tabl. dojel." i "tabl. o przedl. uwalnianiu" nie dzialaja
 * jak zwykla tabletka. Roznej dawki nie proponujemy nigdy, nawet gdy taniej.
 */
function interchangeable(own: Medication, candidate: Medication): boolean {
  if (own.atc === null || candidate.atc === null || own.atc !== candidate.atc) {
    return false;
  }
  const ownParts = splitName(own.name);
  const candidateParts = splitName(candidate.name);
  if (ownParts === null || candidateParts === null) {
    return false;
  }
  return (
    ownParts.form === candidateParts.form &&
    normalizeDose(ownParts.dose) === normalizeDose(candidateParts.dose)
  );
}

// Ile tabletek schodzi miesiecznie wedlug harmonogramu z kreatora.
export function monthlyUnits(medication: UserMedication): number | null {
  const perDose = medication.doses
    .filter((dose) => dose.unit === "TABLET" || dose.unit === "CAPSULE")
    .reduce((sum, dose) => sum + dose.amount, 0);
  if (perDose === 0) {
    return null;
  }

  switch (medication.scheduleType) {
    case "DAILY":
      return perDose * DAYS_IN_MONTH;
    case "WEEKDAYS":
      return (perDose * medication.weekdays.length * DAYS_IN_MONTH) / 7;
    case "EVERY_N_DAYS":
      return medication.intervalDays === null || medication.intervalDays === 0
        ? null
        : (perDose * DAYS_IN_MONTH) / medication.intervalDays;
    case "AS_NEEDED":
      return null;
  }
}

export function findSavings(
  medication: UserMedication,
  candidates: Medication[],
): Savings | null {
  const own = candidates.find((candidate) => candidate.ean === medication.gtin);
  if (own === undefined) {
    return null;
  }
  const ownPerUnit = perUnit(own);
  if (ownPerUnit === null) {
    return null;
  }

  let best: CheaperOption | null = null;
  for (const candidate of candidates) {
    if (candidate.ean === own.ean || candidate.packSize === null) {
      continue;
    }
    const samePack = candidate.name === own.name;
    if (!samePack && !interchangeable(own, candidate)) {
      continue;
    }
    const candidatePerUnit = perUnit(candidate);
    const surcharge = lowestSurcharge(candidate.reimbursement);
    if (
      candidatePerUnit === null ||
      surcharge === null ||
      candidatePerUnit >= ownPerUnit
    ) {
      continue;
    }
    if (best === null || candidatePerUnit < best.perUnit) {
      best = {
        kind: samePack ? "pack" : "substitute",
        name: candidate.name,
        packSize: candidate.packSize,
        surcharge,
        perUnit: candidatePerUnit,
        ean: candidate.ean,
      };
    }
  }

  if (best === null) {
    return null;
  }
  const units = monthlyUnits(medication);
  return {
    best,
    ownPerUnit,
    monthlyUnits: units,
    monthlySaving: units === null ? null : units * (ownPerUnit - best.perUnit),
  };
}
