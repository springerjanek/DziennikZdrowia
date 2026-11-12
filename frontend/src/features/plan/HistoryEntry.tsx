import { ChevronRight } from "lucide-react";
import type { UserScreening } from "@/data/screeningHistory";
import { formatScreeningDate } from "@/domain";

type Props = {
  entry: UserScreening;
  // Bez onOpen wpis jest tylko do czytania - tak uzywa go podsumowanie miesiaca
  // w kalendarzu, gdzie nie ma gdzie otworzyc okienka ze szczegolami.
  onOpen?: () => void;
};

export function HistoryEntry({ entry, onOpen }: Props) {
  const summary = (
    <span className="min-w-0 flex-1 text-slate-600">
      <span className="font-medium">{entry.ruleLabel}</span> —{" "}
      {formatScreeningDate(entry.performedOn)}
      {entry.notes !== null && (
        <span className="block truncate text-slate-500">{entry.notes}</span>
      )}
    </span>
  );

  if (onOpen === undefined) {
    return (
      <li className="flex min-h-11 items-center gap-3 px-2 py-2 text-sm">
        {summary}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-label={`Szczegóły: ${entry.ruleLabel}, ${formatScreeningDate(entry.performedOn)}`}
        onClick={onOpen}
        className="flex min-h-11 w-full items-center gap-3 rounded-field px-2 py-2 text-left text-sm hover:bg-slate-50"
      >
        {summary}
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-slate-400"
        />
      </button>
    </li>
  );
}
