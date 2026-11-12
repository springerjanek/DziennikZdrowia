import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import {
  entitlementLabel,
  formatZloty,
  longDateLabel,
  reimbursementLabel,
  type Reimbursement,
} from "@/domain";

type Props = {
  reimbursement: Reimbursement;
  children: React.ReactNode;
};

function fullPrice(reimbursement: Reimbursement): number | null {
  const prices = reimbursement.indications
    .map((indication) => indication.retailPrice)
    .filter((price) => price !== null);
  return prices.length === 0 ? null : Math.min(...prices);
}

export function ReimbursementExplainer({ reimbursement, children }: Props) {
  const [open, setOpen] = useState(false);
  const price = fullPrice(reimbursement);
  const refunded = reimbursement.level !== "full";

  // Sama data wykazu nie tlumaczy niczego przy leku bez refundacji - nie ma
  // wtedy ani warunku recepty, ani roznicy w cenie.
  const explainable =
    reimbursement.indications.length > 0 ||
    reimbursement.freeFor.length > 0 ||
    (refunded && reimbursement.announcementDate !== null);

  if (!explainable) {
    return <p className="text-sm text-slate-500">{children}</p>;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Dlaczego tyle zapłacisz?"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 text-left text-sm text-slate-500 underline decoration-dotted underline-offset-4 hover:text-brand-700"
      >
        <span>{children}</span>
        <HelpCircle
          aria-hidden="true"
          className="size-5 shrink-0 text-slate-400"
        />
      </button>

      {open && (
        <Modal title="Dlaczego tyle zapłacisz?" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4 text-sm">
            {reimbursement.announcementDate !== null && (
              <p>
                Kwota pochodzi z wykazu leków refundowanych Ministra Zdrowia z{" "}
                {longDateLabel(reimbursement.announcementDate)}.
              </p>
            )}

            {refunded ? (
              <p>
                Obowiązuje przy recepcie z tym poziomem odpłatności.
                {price !== null && (
                  <>
                    {" "}
                    Bez recepty zapłacisz pełną cenę {formatZloty(price)} zł.
                  </>
                )}
              </p>
            ) : (
              <p>Ten lek nie jest refundowany — płacisz pełną cenę.</p>
            )}

            {reimbursement.indications.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-medium">
                  Ile zapłacisz, zależy od rozpoznania na recepcie:
                </p>
                <ul className="flex flex-col gap-1.5">
                  {reimbursement.indications.map((indication) => (
                    <li key={indication.text} className="text-slate-600">
                      <span className="font-medium">{indication.text}</span> —{" "}
                      {reimbursementLabel(indication.level)}
                      {indication.patientSurcharge !== null &&
                        `, ${formatZloty(indication.patientSurcharge)} zł`}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reimbursement.freeFor.length > 0 && (
              <p className="rounded-field bg-success-50 px-3 py-2 text-success-700">
                Bezpłatnie dla{" "}
                {reimbursement.freeFor.map(entitlementLabel).join(", ")}.
              </p>
            )}

            <p className="text-slate-500">
              O tym, który poziom odpłatności trafi na receptę, decyduje lekarz.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
