import { SelectField } from "@/components/SelectField";
import type { Sex } from "@/domain";
import type { OnboardingDraft } from "../draft";

const MONTHS = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Kobieta" },
  { value: "male", label: "Mężczyzna" },
];

type StepProfileProps = {
  draft: OnboardingDraft;
  onChange: (changes: Partial<OnboardingDraft>) => void;
};

export function StepProfile({ draft, onChange }: StepProfileProps) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let year = currentYear - 13; year >= currentYear - 100; year--) {
    years.push(year);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Na tej podstawie dobierzemy badania profilaktyczne, które Ci
        przysługują.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="birthMonth"
          label="Miesiąc urodzenia"
          value={draft.birthMonth === null ? "" : String(draft.birthMonth)}
          onChange={(value) => onChange({ birthMonth: Number(value) })}
        >
          <option value="" disabled>
            Wybierz
          </option>
          {MONTHS.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="birthYear"
          label="Rok urodzenia"
          value={draft.birthYear === null ? "" : String(draft.birthYear)}
          onChange={(value) => onChange({ birthYear: Number(value) })}
        >
          <option value="" disabled>
            Wybierz
          </option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectField>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Płeć</legend>
        <div className="grid grid-cols-2 gap-3">
          {SEX_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-3 font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${
                draft.sex === option.value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <input
                type="radio"
                name="sex"
                value={option.value}
                checked={draft.sex === option.value}
                onChange={() => onChange({ sex: option.value })}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
