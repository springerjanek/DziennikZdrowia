import { PiggyBank } from "lucide-react";
import { formatZloty, type Savings } from "@/domain";

type Props = {
  savings: Savings;
};

export function CheaperOption({ savings }: Props) {
  const { best, ownPerUnit, monthlySaving } = savings;

  // Przy tanich tabletkach obie kwoty zaokraglaja sie do tego samego grosza -
  // wtedy porownanie za sztuke nic nie wnosi.
  const perUnitWorthShowing =
    formatZloty(best.perUnit) !== formatZloty(ownPerUnit);

  return (
    <div className="flex flex-col gap-1 rounded-field bg-success-50 px-3 py-2 text-sm text-success-700">
      <p className="flex items-center gap-1.5 font-medium">
        <PiggyBank aria-hidden="true" className="size-5 shrink-0" />
        {best.kind === "pack"
          ? `Większe opakowanie wychodzi taniej: ${best.packSize}`
          : `Tańszy zamiennik: ${best.name}, ${best.packSize}`}
      </p>

      {perUnitWorthShowing && (
        <p>
          {formatZloty(best.perUnit)} zł za sztukę zamiast{" "}
          {formatZloty(ownPerUnit)} zł. Dopłata za opakowanie:{" "}
          {formatZloty(best.surcharge)} zł.
        </p>
      )}

      {monthlySaving !== null && monthlySaving >= 0.01 && (
        <p>
          Przy Twoim dawkowaniu to około {formatZloty(monthlySaving)} zł mniej
          miesięcznie.
        </p>
      )}

      {best.kind === "substitute" && (
        <p className="text-slate-600">
          To inny producent tej samej substancji w tej samej dawce i postaci.
          Zapytaj w aptece — zamiennik wydaje farmaceuta.
        </p>
      )}
    </div>
  );
}
