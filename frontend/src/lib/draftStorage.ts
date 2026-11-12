import { z } from "zod";
import {
  emptyMedicationDraft,
  medicationDraftSchema,
  type MedicationDraft,
} from "@/features/medications/draft";
import { voivodeshipCodeSchema, type VoivodeshipCode } from "@/domain";
import {
  emptyDraft,
  onboardingDraftSchema,
  type OnboardingDraft,
} from "@/features/onboarding/draft";

const ONBOARDING_KEY = "dz.onboarding.draft.v1";
const VOIVODESHIP_KEY = "dz.voivodeship.v1";
const ACCESS_KEY = "dz.access.v1";
const MEDICATION_KEY = "dz.medication.draft.v1";

function read<T extends object>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return fallback;
    }

    // Brakujace pola bierzemy z pustego szkicu - zapis sprzed zmiany formularza
    // ma wtedy szanse przejsc zamiast wyladowac w koszu.
    const result = schema.safeParse({ ...fallback, ...parsed });

    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // brak miejsca albo tryb prywatny - formularz dziala dalej, tylko bez pamieci
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // jw.
  }
}

export function loadDraft(): OnboardingDraft {
  return read(ONBOARDING_KEY, onboardingDraftSchema, emptyDraft);
}

export function saveDraft(draft: OnboardingDraft): void {
  write(ONBOARDING_KEY, draft);
}

export function clearDraft(): void {
  remove(ONBOARDING_KEY);
}

export function loadMedicationDraft(): MedicationDraft {
  return read(MEDICATION_KEY, medicationDraftSchema, emptyMedicationDraft());
}

export function saveMedicationDraft(draft: MedicationDraft): void {
  write(MEDICATION_KEY, draft);
}

export function clearMedicationDraft(): void {
  remove(MEDICATION_KEY);
}

const voivodeshipStoreSchema = z.object({
  code: voivodeshipCodeSchema.nullable(),
});

// Do czasu zapisywania lokalizacji w profilu (#21) wojewodztwo bierzemy z tego,
// co uzytkownik podal w kreatorze, a jego wybor na ekranie placowek pamietamy tutaj.
export function loadVoivodeship(): VoivodeshipCode | null {
  const stored = read(VOIVODESHIP_KEY, voivodeshipStoreSchema, { code: null });
  return stored.code ?? loadDraft().voivodeship;
}

export function saveVoivodeship(code: VoivodeshipCode): void {
  write(VOIVODESHIP_KEY, { code });
}

const accessNeedsSchema = z.object({
  needs: z.array(z.string()),
});

// Czego uzytkownik potrzebuje w placowce (winda, podjazd, parking, toaleta).
// Zostaje na tym urzadzeniu - nie wysylamy tego nigdzie, bo potrzeba windy
// mowi o zdrowiu, a nie o preferencji interfejsu.
export function loadAccessNeeds(): string[] {
  return read(ACCESS_KEY, accessNeedsSchema, { needs: [] }).needs;
}

export function saveAccessNeeds(needs: string[]): void {
  write(ACCESS_KEY, { needs });
}
