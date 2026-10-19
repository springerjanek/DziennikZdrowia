import { SelectField } from "@/components/SelectField";
import { VOIVODESHIPS, type VoivodeshipCode } from "@/domain";
import type { OnboardingDraft } from "../draft";

type StepLocationProps = {
  draft: OnboardingDraft;
  onChange: (changes: Partial<OnboardingDraft>) => void;
};

export function StepLocation({ draft, onChange }: StepLocationProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Znajdziemy terminy w Twojej okolicy. Zmienisz to w każdej chwili.
      </p>

      <SelectField
        id="voivodeship"
        label="Województwo"
        value={draft.voivodeship ?? ""}
        onChange={(value) =>
          onChange({ voivodeship: value as VoivodeshipCode })
        }
      >
        <option value="" disabled>
          Wybierz
        </option>
        {VOIVODESHIPS.map((voivodeship) => (
          <option key={voivodeship.code} value={voivodeship.code}>
            {voivodeship.name}
          </option>
        ))}
      </SelectField>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="locality" className="text-sm font-medium">
          Miejscowość
        </label>
        <input
          id="locality"
          type="text"
          autoComplete="address-level2"
          placeholder="np. Poznań"
          value={draft.locality}
          onChange={(event) => onChange({ locality: event.target.value })}
          className="w-full rounded-field border border-slate-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
