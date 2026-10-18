import { useEffect, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { ProgressBar } from "./ProgressBar";
import { StepConditions } from "./steps/StepConditions";
import { StepCycle } from "./steps/StepCycle";
import { StepLocation } from "./steps/StepLocation";
import { StepMedications } from "./steps/StepMedications";
import { StepReminders } from "./steps/StepReminders";
import { StepProfile } from "./steps/StepProfile";
import { pluralBadania } from "@/lib/plural";
import {
  draftToProfile,
  recommendationCount,
  type OnboardingDraft,
} from "./draft";
import { canLeaveStep, STEP_TITLES, stepsFor } from "./stepFlow";
import { loadDraft, saveDraft } from "@/lib/draftStorage";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<OnboardingDraft>(loadDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStepIndex = useRef(0);

  const steps = stepsFor(draft);
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];
  const isLastStep = safeIndex === steps.length - 1;

  const count = recommendationCount(draft);
  const profileComplete = draftToProfile(draft) !== null;
  const canContinue = canLeaveStep(currentStep, draft);

  let statusMessage = "";
  if (!profileComplete) {
    statusMessage = "Uzupełnij dane, a dobierzemy badania profilaktyczne.";
  } else if (count > 0) {
    statusMessage = `Dobraliśmy dla Ciebie ${count} ${pluralBadania(count)}.`;
  }

  useEffect(() => {
    if (previousStepIndex.current !== safeIndex) {
      headingRef.current?.focus();
    }
    previousStepIndex.current = safeIndex;
  }, [safeIndex]);

  function updateDraft(changes: Partial<OnboardingDraft>) {
    const next = { ...draft, ...changes };
    setDraft(next);
    saveDraft(next);
  }

  function goNext() {
    if (isLastStep) {
      void navigate("/konto");
      return;
    }
    setStepIndex(safeIndex + 1);
  }

  function renderStep(): ReactElement {
    switch (currentStep) {
      case "profile":
        return <StepProfile draft={draft} onChange={updateDraft} />;
      case "location":
        return <StepLocation draft={draft} onChange={updateDraft} />;
      case "conditions":
        return <StepConditions draft={draft} onChange={updateDraft} />;
      case "medications":
        return <StepMedications draft={draft} onChange={updateDraft} />;
      case "cycle":
        return <StepCycle draft={draft} onChange={updateDraft} />;
      case "reminders":
        return <StepReminders draft={draft} onChange={updateDraft} />;
    }
  }

  function goBack() {
    if (safeIndex > 0) {
      setStepIndex(safeIndex - 1);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-8 px-4 py-10">
      <ProgressBar current={safeIndex + 1} total={steps.length} />

      <div className="flex flex-col gap-6">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold text-balance"
        >
          {STEP_TITLES[currentStep]}
        </h1>

        {renderStep()}
      </div>

      {currentStep === "profile" && (
        <p
          aria-live="polite"
          className={`min-h-5 text-sm text-slate-600 ${
            count > 0 ? "shimmer-text" : ""
          }`}
        >
          {statusMessage}
        </p>
      )}

      <div className="mt-auto flex gap-3">
        {safeIndex > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-100"
          >
            Wstecz
          </button>
        )}
        <button
          type="button"
          onClick={goNext}
          disabled={!canContinue}
          className="flex-1 rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLastStep ? "Gotowe" : "Dalej"}
        </button>
      </div>
    </main>
  );
}
