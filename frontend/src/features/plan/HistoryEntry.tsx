import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { deleteScreening, type UserScreening } from "@/data/screeningHistory";
import { formatScreeningDate } from "@/domain";

type Props = {
  entry: UserScreening;
};

export function HistoryEntry({ entry }: Props) {
  const revalidator = useRevalidator();
  // Dwa klikniecia zamiast okienka z potwierdzeniem: kasujemy wpis o zdrowiu,
  // wiec nie chcemy, zeby stalo sie to jednym przypadkowym kliknieciem.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove(): void {
    setError(null);
    deleteScreening(entry.id)
      .then(() => void revalidator.revalidate())
      .catch(() => {
        setError("Nie udało się usunąć.");
        setConfirming(false);
      });
  }

  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className="flex-1 text-slate-600">
        <span className="font-medium">{entry.ruleLabel}</span> —{" "}
        {formatScreeningDate(entry.performedOn)}
      </span>

      {confirming ? (
        <>
          <button
            type="button"
            onClick={remove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium bg-danger-600 text-white hover:bg-danger-700"
          >
            Na pewno usuń
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Anuluj
          </button>
        </>
      ) : (
        <button
          type="button"
          aria-label={`Usuń ${entry.ruleLabel}`}
          onClick={() => setConfirming(true)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium border border-slate-300 text-slate-600 hover:border-danger-600 hover:bg-danger-50 hover:text-danger-700"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Usuń
        </button>
      )}

      {error !== null && (
        <span role="alert" className="text-xs text-danger-600">
          {error}
        </span>
      )}
    </li>
  );
}
