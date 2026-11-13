import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useRevalidator } from "react-router";
import { deleteScreening, type UserScreening } from "@/data/screeningHistory";
import { formatScreeningDate } from "@/domain";

type Props = {
  entry: UserScreening;
  onDeleted: () => void;
};

export function HistoryDetails({ entry, onDeleted }: Props) {
  const revalidator = useRevalidator();
  // Dwa klikniecia zamiast okienka z potwierdzeniem: kasujemy wpis o zdrowiu,
  // wiec nie chcemy, zeby stalo sie to jednym przypadkowym kliknieciem.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function remove(): void {
    setError(null);
    deleteScreening(entry.id)
      .then(() => {
        void revalidator.revalidate();
        onDeleted();
      })
      .catch(() => {
        setError("Nie udało się usunąć. Spróbuj ponownie.");
        setConfirming(false);
      });
  }

  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="font-medium">Kiedy wykonane</dt>
          <dd className="text-slate-600">
            {formatScreeningDate(entry.performedOn)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="font-medium">Notatka</dt>
          <dd className="text-slate-600">
            {entry.notes ?? "Nie dodałeś notatki do tego badania."}
          </dd>
        </div>
      </dl>

      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={remove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-field bg-danger-600 px-3 py-2 text-sm font-medium text-white hover:bg-danger-700"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Na pewno usuń
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="inline-flex min-h-11 items-center rounded-field px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Anuluj
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-field border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-danger-600 hover:bg-danger-50 hover:text-danger-700"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Usuń z historii
        </button>
      )}

      {error !== null && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
