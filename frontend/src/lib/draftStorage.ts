import {
  emptyDraft,
  onboardingDraftSchema,
  type OnboardingDraft,
} from "@/features/onboarding/draft";

const STORAGE_KEY = "dz.onboarding.draft.v1";

export function loadDraft(): OnboardingDraft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return emptyDraft;
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return emptyDraft;
    }

    const merged = { ...emptyDraft, ...parsed };
    const result = onboardingDraftSchema.safeParse(merged);

    return result.success ? result.data : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

export function saveDraft(draft: OnboardingDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // brak miejsca albo tryb prywatny - onboarding dziala dalej bez zapisu
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // jw.
  }
}
