import {
  MAX_CYCLE_LENGTH_DAYS,
  MIN_CYCLE_LENGTH_DAYS,
} from "@/domain";
import type { OnboardingDraft } from "../draft";

type StepCycleProps = {
  draft: OnboardingDraft;
  onChange: (changes: Partial<OnboardingDraft>) => void;
};

export function StepCycle({ draft, onChange }: StepCycleProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Dwa pola wystarczą, żebyśmy przypomnieli o zbliżającym się terminie.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="lastPeriodStart" className="text-sm font-medium">
          Pierwszy dzień ostatniej miesiączki
        </label>
        <input
          id="lastPeriodStart"
          type="date"
          max={today}
          value={draft.lastPeriodStart}
          onChange={(event) =>
            onChange({ lastPeriodStart: event.target.value })
          }
          className="w-full rounded-field border border-slate-300 bg-white px-3 py-2.5"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="averageCycleLength" className="text-sm font-medium">
          Średnia długość cyklu:{" "}
          <span className="text-brand-700">{draft.averageCycleLength} dni</span>
        </label>
        <input
          id="averageCycleLength"
          type="range"
          min={MIN_CYCLE_LENGTH_DAYS}
          max={MAX_CYCLE_LENGTH_DAYS}
          value={draft.averageCycleLength}
          onChange={(event) =>
            onChange({ averageCycleLength: Number(event.target.value) })
          }
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{MIN_CYCLE_LENGTH_DAYS}</span>
          <span>{MAX_CYCLE_LENGTH_DAYS}</span>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-field border border-slate-300 bg-white px-3 py-3">
        <input
          type="checkbox"
          checked={draft.cycleConsent}
          onChange={(event) => onChange({ cycleConsent: event.target.checked })}
          className="mt-0.5 size-5 shrink-0 accent-brand-600"
        />
        <span className="text-sm">
          Zgadzam się na przetwarzanie danych o cyklu miesiączkowym. Zgodę
          cofniesz w każdej chwili, a dane usuniemy.
        </span>
      </label>

      <p className="text-sm text-slate-500">
        To tylko orientacyjne przypomnienie. Nie jest metodą antykoncepcji.
      </p>
    </div>
  );
}
