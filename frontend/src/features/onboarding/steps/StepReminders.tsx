import { SelectField } from "@/components/SelectField";
import type { OnboardingDraft } from "../draft";

const TIMES = ["07:00", "08:00", "09:00", "12:00", "18:00", "20:00"];

const DAYS_BEFORE = [
  { value: 1, label: "dzień wcześniej" },
  { value: 3, label: "3 dni wcześniej" },
  { value: 7, label: "tydzień wcześniej" },
  { value: 14, label: "2 tygodnie wcześniej" },
  { value: 30, label: "miesiąc wcześniej" },
];

type StepRemindersProps = {
  draft: OnboardingDraft;
  onChange: (changes: Partial<OnboardingDraft>) => void;
};

export function StepReminders({ draft, onChange }: StepRemindersProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-slate-600">
        Damy znać, zanim termin minie. Zawsze możesz to wyłączyć.
      </p>

      <label className="flex items-center gap-3 rounded-field border border-slate-300 bg-white px-3 py-3">
        <input
          type="checkbox"
          checked={draft.reminderEmail}
          onChange={(event) => onChange({ reminderEmail: event.target.checked })}
          className="size-5 accent-brand-600"
        />
        <span className="font-medium">Przypomnienia e-mail</span>
      </label>

      {draft.reminderEmail && (
        <>
          <SelectField
            id="reminderDaysBefore"
            label="Kiedy przypomnieć"
            value={String(draft.reminderDaysBefore)}
            onChange={(value) =>
              onChange({ reminderDaysBefore: Number(value) })
            }
          >
            {DAYS_BEFORE.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            id="reminderTime"
            label="O której godzinie"
            value={draft.reminderTime}
            onChange={(value) => onChange({ reminderTime: value })}
          >
            {TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </SelectField>
        </>
      )}
    </div>
  );
}
