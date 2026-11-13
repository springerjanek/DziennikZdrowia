import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import {
  entitlementLabel,
  formatZloty,
  freeForUser,
  longDateLabel,
  reimbursementLabel,
  type EntitlementCode,
  type Reimbursement,
} from "@/domain";

type Props = {
  reimbursement: Reimbursement;
  entitlements: EntitlementCode[];
  children: React.ReactNode;
};

function fullPrice(reimbursement: Reimbursement): number | null {
  const prices = reimbursement.indications
    .map((indication) => indication.retailPrice)
    .filter((price) => price !== null);
  return prices.length === 0 ? null : Math.min(...prices);
}

export function ReimbursementExplainer({
  reimbursement,
  entitlements,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const price = fullPrice(reimbursement);
  const refunded = reimbursement.level !== "full";
  const free = freeForUser(reimbursement, entitlements);

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

            {refunded && !free ? (
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
              !free && <p>Ten lek nie jest refundowany — płacisz pełną cenę.</p>
            )}

            {reimbursement.indications.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-medium">
                  {reimbursement.indications.length > 1
                    ? "Ile zapłacisz, zależy od rozpoznania na recepcie:"
                    : "Wskazanie objęte refundacją:"}
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

            {free ? (
              <p className="rounded-field bg-success-50 px-3 py-2 font-medium text-success-700">
                Ten lek przysługuje Ci bezpłatnie — przy recepcie z adnotacją o
                uprawnieniu zapłacisz 0 zł.
              </p>
            ) : (
              reimbursement.freeFor.length > 0 && (
                <p className="rounded-field bg-slate-100 px-3 py-2">
                  Bezpłatnie dla{" "}
                  {reimbursement.freeFor.map(entitlementLabel).join(", ")}.
                </p>
              )
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
