import { shouldAskAboutCycle } from "@/domain";
import { draftToProfile, type OnboardingDraft } from "./draft";

export type Step =
  | "profile"
  | "location"
  | "conditions"
  | "medications"
  | "cycle"
  | "reminders";

export const STEP_TITLES: Record<Step, string> = {
  profile: "Dane osobowe",
  location: "Gdzie będziesz szukać opieki?",
  conditions: "Choroby przewlekłe",
  medications: "Leki",
  cycle: "Cykl miesiączkowy",
  reminders: "Przypomnienia",
};

export function stepsFor(draft: OnboardingDraft): Step[] {
  const steps: Step[] = ["profile", "location", "conditions", "medications"];
  const profile = draftToProfile(draft);

  if (profile !== null && shouldAskAboutCycle(profile)) {
    steps.push("cycle");
  }

  steps.push("reminders");
  return steps;
}

export function canLeaveStep(step: Step, draft: OnboardingDraft): boolean {
  switch (step) {
    case "profile":
      return draftToProfile(draft) !== null;
    case "location":
      return draft.voivodeship !== null && draft.locality.trim() !== "";
    default:
      return true;
  }
}
