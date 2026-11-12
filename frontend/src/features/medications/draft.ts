import { z } from "zod";
import {
  doseUnitSchema,
  formatDoseTime,
  medicationSchema,
  scheduleTypeSchema,
  toIsoDate,
  weekdaySchema,
  type Medication,
  type UserMedication,
  type UserMedicationRequest,
} from "@/domain";

// Formularz trzyma liczby jako tekst, bo puste pole to "" - dopiero przy wysylce
// robimy z tego liczby i nulle, ktorych oczekuje backend.
const doseDraftSchema = z.object({
  time: z.string(),
  amount: z.string(),
  unit: doseUnitSchema,
  instruction: z.string(),
});

export type DoseDraft = z.infer<typeof doseDraftSchema>;

// Schemat, a nie sam typ, bo szkic wraca z localStorage - trzeba sprawdzic,
// czy to, co tam lezy, nadal pasuje do formularza.
export const medicationDraftSchema = z.object({
  medication: medicationSchema.nullable(),
  scheduleType: scheduleTypeSchema,
  weekdays: z.array(weekdaySchema),
  intervalDays: z.string(),
  maxDailyDoses: z.string(),
  doses: z.array(doseDraftSchema).min(1),
  startDate: z.string(),
  endDate: z.string(),
  notes: z.string(),
});

export type MedicationDraft = z.infer<typeof medicationDraftSchema>;

export function emptyDose(): DoseDraft {
  return { time: "", amount: "1", unit: "TABLET", instruction: "" };
}

export function emptyMedicationDraft(): MedicationDraft {
  return {
    medication: null,
    scheduleType: "DAILY",
    weekdays: [],
    intervalDays: "2",
    maxDailyDoses: "",
    doses: [{ ...emptyDose(), time: "08:00" }],
    startDate: toIsoDate(new Date()),
    endDate: "",
    notes: "",
  };
}

// Odwrotnosc draftToRequest: z zapisanego leku robi szkic do formularza.
export function draftFromMedication(
  medication: UserMedication,
): MedicationDraft {
  return {
    medication: {
      ean: medication.gtin,
      name: medication.name,
      activeSubstance: medication.activeSubstance,
      // Wielkosc opakowania, cena i ATC sa tylko w wykazie - przy zapisanym leku
      // zostaje sama odplatnosc, bo tylko ona wraca z naszego API.
      packSize: null,
      retailPrice: null,
      atc: null,
      reimbursement: medication.reimbursement,
    },
    scheduleType: medication.scheduleType,
    weekdays: medication.weekdays,
    intervalDays:
      medication.intervalDays === null ? "2" : String(medication.intervalDays),
    maxDailyDoses:
      medication.maxDailyDoses === null
        ? ""
        : String(medication.maxDailyDoses),
    doses: medication.doses.map((dose) => ({
      // Backend oddaje "08:00:00", a <input type="time"> chce "08:00".
      time: dose.time === null ? "" : formatDoseTime(dose.time),
      amount: String(dose.amount),
      unit: dose.unit,
      instruction: dose.instruction ?? "",
    })),
    startDate: medication.startDate,
    endDate: medication.endDate ?? "",
    notes: medication.notes ?? "",
  };
}

// Lek w razie potrzeby ma u backendu dokladnie jedna dawke bez godziny. Nie kasujemy
// przy tym pozostalych por - user moze wrocic do harmonogramu i je odzyskac.
export function draftDoses(draft: MedicationDraft): DoseDraft[] {
  return draft.scheduleType === "AS_NEEDED" ? draft.doses.slice(0, 1) : draft.doses;
}

// Te same reguly sprawdza UserMedicationService; tutaj po to, zeby user zobaczyl,
// co poprawic, zamiast dostac 400 bez wyjasnienia.
export function problemWith(draft: MedicationDraft): string | null {
  const asNeeded = draft.scheduleType === "AS_NEEDED";

  if (draft.scheduleType === "WEEKDAYS" && draft.weekdays.length === 0) {
    return "Zaznacz co najmniej jeden dzień tygodnia.";
  }
  if (draft.scheduleType === "EVERY_N_DAYS") {
    const days = Number(draft.intervalDays);
    if (!Number.isInteger(days) || days < 2 || days > 365) {
      return "Podaj, co ile dni bierzesz lek — od 2 do 365.";
    }
  }
  if (asNeeded && draft.maxDailyDoses !== "") {
    const limit = Number(draft.maxDailyDoses);
    if (!Number.isInteger(limit) || limit < 1 || limit > 24) {
      return "Maksymalna liczba dawek na dobę to 1–24.";
    }
  }

  const doses = draftDoses(draft);
  for (const dose of doses) {
    const amount = Number(dose.amount);
    if (dose.amount === "" || !Number.isFinite(amount) || amount <= 0) {
      return "Dawka musi być liczbą większą od zera.";
    }
    if (!asNeeded && dose.time === "") {
      return "Każda pora musi mieć godzinę.";
    }
  }
  if (!asNeeded) {
    const times = doses.map((dose) => dose.time);
    if (new Set(times).size !== times.length) {
      return "Godziny nie mogą się powtarzać.";
    }
  }

  if (draft.startDate === "") {
    return "Podaj datę rozpoczęcia.";
  }
  if (draft.endDate !== "" && draft.endDate < draft.startDate) {
    return "Data zakończenia jest wcześniejsza niż rozpoczęcia.";
  }
  return null;
}

export function draftToRequest(
  draft: MedicationDraft,
  medication: Medication,
): UserMedicationRequest {
  const asNeeded = draft.scheduleType === "AS_NEEDED";

  return {
    gtin: medication.ean,
    name: medication.name,
    activeSubstance: medication.activeSubstance,
    scheduleType: draft.scheduleType,
    weekdays: draft.scheduleType === "WEEKDAYS" ? draft.weekdays : [],
    intervalDays:
      draft.scheduleType === "EVERY_N_DAYS" ? Number(draft.intervalDays) : null,
    maxDailyDoses:
      asNeeded && draft.maxDailyDoses !== "" ? Number(draft.maxDailyDoses) : null,
    startDate: draft.startDate,
    endDate: draft.endDate === "" ? null : draft.endDate,
    notes: draft.notes.trim() === "" ? null : draft.notes.trim(),
    doses: draftDoses(draft).map((dose) => ({
      time: asNeeded ? null : dose.time,
      amount: Number(dose.amount),
      unit: dose.unit,
      instruction:
        dose.instruction.trim() === "" ? null : dose.instruction.trim(),
    })),
  };
}
