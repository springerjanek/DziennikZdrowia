import { z } from "zod";
import { pluralForm, type PluralForms } from "@/lib/plural";
import { reimbursementSchema } from "./medications";

export const scheduleTypeSchema = z.enum([
  "DAILY",
  "WEEKDAYS",
  "EVERY_N_DAYS",
  "AS_NEEDED",
]);

export type ScheduleType = z.infer<typeof scheduleTypeSchema>;

export const doseUnitSchema = z.enum([
  "TABLET",
  "CAPSULE",
  "MG",
  "ML",
  "DROP",
  "PUFF",
  "UNIT",
  "SACHET",
  "PATCH",
]);

export type DoseUnit = z.infer<typeof doseUnitSchema>;

export const weekdaySchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export type Weekday = z.infer<typeof weekdaySchema>;

// Backend oddaje godzine jako "08:00:00"; leki w razie potrzeby nie maja godziny.
export const doseSchema = z.object({
  time: z.string().nullable(),
  amount: z.number(),
  unit: doseUnitSchema,
  instruction: z.string().nullable(),
});

export type Dose = z.infer<typeof doseSchema>;

// Odpowiada UserMedicationResponse. Uwaga: tu pole nazywa sie "gtin",
// a w wynikach wyszukiwania to samo pole nazywa sie "ean".
export const userMedicationSchema = z.object({
  id: z.string(),
  gtin: z.string().nullable(),
  name: z.string(),
  activeSubstance: z.string().nullable(),
  scheduleType: scheduleTypeSchema,
  weekdays: z.array(weekdaySchema),
  intervalDays: z.number().nullable(),
  maxDailyDoses: z.number().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  notes: z.string().nullable(),
  doses: z.array(doseSchema),
  reimbursement: reimbursementSchema,
});

export type UserMedication = z.infer<typeof userMedicationSchema>;

export function userMedicationKey(medication: UserMedication): string {
  return medication.gtin ?? medication.name;
}

export const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

// Skroty tylko na przyciski w formularzu, gdzie siedem nazw musi sie zmiescic w rzedzie.
const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "pon.",
  TUESDAY: "wt.",
  WEDNESDAY: "śr.",
  THURSDAY: "czw.",
  FRIDAY: "pt.",
  SATURDAY: "sob.",
  SUNDAY: "niedz.",
};

// W zdaniu piszemy dni w calosci: "w poniedziałki i czwartki".
const WEEKDAY_PLURALS: Record<Weekday, string> = {
  MONDAY: "poniedziałki",
  TUESDAY: "wtorki",
  WEDNESDAY: "środy",
  THURSDAY: "czwartki",
  FRIDAY: "piątki",
  SATURDAY: "soboty",
  SUNDAY: "niedziele",
};

// Pelnym slowem, nie skrotem z opakowania: aplikacji uzywaja takze seniorzy,
// a "1 tabl." czyta sie gorzej niz "1 tabletka". "fraction" to postac po ulamku
// ("0,5 tabletki"), ktorej polska liczba mnoga nie obsluguje.
type UnitForms = PluralForms & { fraction: string };

const UNIT_FORMS: Record<DoseUnit, UnitForms> = {
  TABLET: {
    one: "tabletka",
    few: "tabletki",
    many: "tabletek",
    fraction: "tabletki",
  },
  CAPSULE: {
    one: "kapsułka",
    few: "kapsułki",
    many: "kapsułek",
    fraction: "kapsułki",
  },
  MG: { one: "mg", few: "mg", many: "mg", fraction: "mg" },
  ML: { one: "ml", few: "ml", many: "ml", fraction: "ml" },
  DROP: {
    one: "kropla",
    few: "krople",
    many: "kropli",
    fraction: "kropli",
  },
  PUFF: {
    one: "wdech",
    few: "wdechy",
    many: "wdechów",
    fraction: "wdechu",
  },
  UNIT: {
    one: "jednostka",
    few: "jednostki",
    many: "jednostek",
    fraction: "jednostki",
  },
  SACHET: {
    one: "saszetka",
    few: "saszetki",
    many: "saszetek",
    fraction: "saszetki",
  },
  PATCH: {
    one: "plaster",
    few: "plastry",
    many: "plastrów",
    fraction: "plastra",
  },
};

// Sama nazwa jednostki, bez liczby - do wyboru w formularzu.
export function doseUnitLabel(unit: DoseUnit): string {
  return UNIT_FORMS[unit].one;
}

export function doseUnitFor(unit: DoseUnit, amount: number): string {
  const forms = UNIT_FORMS[unit];
  return Number.isInteger(amount)
    ? pluralForm(amount, forms)
    : forms.fraction;
}

export function weekdayLabel(day: Weekday): string {
  return WEEKDAY_LABELS[day];
}

// Kolejnosc jak w formularzu dawki: najpierw to, co na receptach najczestsze.
export const DOSE_UNITS: DoseUnit[] = [
  "TABLET",
  "CAPSULE",
  "MG",
  "ML",
  "DROP",
  "PUFF",
  "SACHET",
  "PATCH",
  "UNIT",
];

// "08:00:00" -> "08:00"
export function formatDoseTime(time: string): string {
  return time.slice(0, 5);
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("pl-PL");
}

export function formatDose(dose: Dose): string {
  return `${formatAmount(dose.amount)} ${doseUnitFor(dose.unit, dose.amount)}`;
}

export function describeSchedule(medication: UserMedication): string {
  switch (medication.scheduleType) {
    case "DAILY":
      return "codziennie";
    case "WEEKDAYS": {
      const days = WEEKDAYS.filter((day) =>
        medication.weekdays.includes(day),
      ).map((day) => WEEKDAY_PLURALS[day]);
      if (days.length === 1) {
        return `w ${days[0]}`;
      }
      // Ostatni dzien laczymy przez "i", reszte przecinkami.
      return `w ${days.slice(0, -1).join(", ")} i ${days[days.length - 1]}`;
    }
    case "EVERY_N_DAYS":
      return medication.intervalDays === 2
        ? "co dwa dni"
        : `co ${medication.intervalDays} dni`;
    case "AS_NEEDED":
      return medication.maxDailyDoses === null
        ? "w razie potrzeby"
        : `w razie potrzeby, najwyżej ${medication.maxDailyDoses} razy na dobę`;
  }
}

// Co wysylamy, dodajac albo zmieniajac lek - odpowiada UserMedicationRequest z backendu.
// Pola zalezne od harmonogramu musza byc puste, gdy nie dotycza: backend odrzuca
// np. intervalDays przy DAILY.
export type DoseRequest = {
  time: string | null;
  amount: number;
  unit: DoseUnit;
  instruction: string | null;
};

export type UserMedicationRequest = {
  gtin: string | null;
  name: string;
  activeSubstance: string | null;
  scheduleType: ScheduleType;
  weekdays: Weekday[];
  intervalDays: number | null;
  maxDailyDoses: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  doses: DoseRequest[];
};
