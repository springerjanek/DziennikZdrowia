import { SelectField } from "@/components/SelectField";
import type { UserScreening } from "@/data/screeningHistory";
import { ANY, filterHistory, ruleChoices, yearChoices } from "./historyFilter";

type Props = {
  history: UserScreening[];
  rule: string;
  year: string;
  onRule: (value: string) => void;
  onYear: (value: string) => void;
};

export function HistoryFilters({ history, rule, year, onRule, onYear }: Props) {
  const rules = ruleChoices(history);
  const years = yearChoices(history);
  const shown = filterHistory(history, rule, year).length;
  const filtering = rule !== ANY || year !== ANY;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="filtr-badanie"
          label="Pokaż badanie"
          value={rule}
          onChange={onRule}
        >
          <option value={ANY}>Wszystkie badania</option>
          {rules.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </SelectField>

        <SelectField
          id="filtr-rok"
          label="Z roku"
          value={year}
          onChange={onYear}
        >
          <option value={ANY}>Wszystkie lata</option>
          {years.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </SelectField>
      </div>

      {filtering && (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-slate-600">
            Pokazujemy {shown} z {history.length}.
          </p>
          <button
            type="button"
            onClick={() => {
              onRule(ANY);
              onYear(ANY);
            }}
            className="inline-flex min-h-11 items-center rounded-field px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
          >
            Pokaż wszystkie
          </button>
        </div>
      )}
    </div>
  );
}
