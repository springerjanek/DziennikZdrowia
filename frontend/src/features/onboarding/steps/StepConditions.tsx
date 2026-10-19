import { Chip } from "@/components/Chip";
import { CHRONIC_CONDITIONS } from "@/domain";
import { toggleCondition, type OnboardingDraft } from "../draft";

type StepConditionsProps = {
  draft: OnboardingDraft;
  onChange: (changes: Partial<OnboardingDraft>) => void;
};

export function StepConditions({ draft, onChange }: StepConditionsProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Zaznacz to, co Cię dotyczy. Na tej podstawie przypomnimy o badaniach
        kontrolnych.
      </p>

      <div className="flex flex-wrap gap-2">
        {CHRONIC_CONDITIONS.map((condition) => (
          <Chip
            key={condition.id}
            label={condition.label}
            selected={draft.conditions.includes(condition.id)}
            onToggle={() =>
              onChange({
                conditions: toggleCondition(draft.conditions, condition.id),
              })
            }
          />
        ))}
      </div>

      {draft.conditions.length === 0 && (
        <p className="text-sm text-slate-500">
          Nic nie zaznaczasz? Możesz pominąć ten krok.
        </p>
      )}
    </div>
  );
}
