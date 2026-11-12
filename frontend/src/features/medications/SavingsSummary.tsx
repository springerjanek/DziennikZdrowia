import { PiggyBank } from "lucide-react";
import { formatZloty, type Savings } from "@/domain";

type Props = {
  savings: Savings[];
};

export function SavingsSummary({ savings }: Props) {
  const monthly = savings.reduce(
    (sum, item) => sum + (item.monthlySaving ?? 0),
    0,
  );

  // Ponizej grosza nie ma o czym pisac, a przy "w razie potrzeby" nie wiemy,
  // ile tabletek zejdzie - takie leki nie wchodza do sumy.
  if (monthly < 0.01) {
    return null;
  }

  return (
    <section className="flex items-start gap-2 rounded-card border border-success-200 bg-success-50 p-4 text-success-700">
      <PiggyBank aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">
          Możesz płacić około {formatZloty(monthly)} zł mniej miesięcznie
        </h2>
        <p className="text-sm">
          Tyle wychodzi, jeśli kupisz tańsze opakowania zaznaczone niżej przy
          lekach. To ta sama substancja w tej samej dawce.
        </p>
      </div>
    </section>
  );
}
