import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  describeDue,
  describeSchedule,
  formatDose,
  formatDoseTime,
  formatReimbursementCost,
  formatScreeningDate,
  fullDateLabel,
  type PlanEvent,
} from "@/domain";
import { PharmacyLink } from "@/components/PharmacyLink";

type Props = {
  event: PlanEvent;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const editLinkClassName =
  "inline-flex min-h-11 items-center self-start rounded-field border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100";

export function EventDetails({ event }: Props) {
  const cost =
    event.kind === "dose" || event.kind === "asNeeded"
      ? formatReimbursementCost(event.medication.reimbursement)
      : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">{fullDateLabel(event.day)}</p>

      {event.kind === "dose" && (
        <>
          <dl className="flex flex-col gap-2">
            <Field label="Godzina">
              {event.dose.time === null
                ? "Bez stałej godziny"
                : formatDoseTime(event.dose.time)}
            </Field>
            <Field label="Dawka">{formatDose(event.dose)}</Field>
            {event.dose.instruction !== null && (
              <Field label="Zalecenie">{event.dose.instruction}</Field>
            )}
            <Field label="Jak często">
              {describeSchedule(event.medication)}
            </Field>
            {cost !== null && <Field label="Odpłatność">{cost}</Field>}
            {event.medication.notes !== null && (
              <Field label="Twoja notatka">{event.medication.notes}</Field>
            )}
          </dl>
          <Link to="/dashboard/leki" className={editLinkClassName}>
            Zmień godzinę lub dawkę
          </Link>
          <PharmacyLink name={event.medication.name} />
        </>
      )}

      {event.kind === "asNeeded" && (
        <>
          <dl className="flex flex-col gap-2">
            <Field label="Jak często">
              {describeSchedule(event.medication)}
            </Field>
            {event.medication.notes !== null && (
              <Field label="Twoja notatka">{event.medication.notes}</Field>
            )}
          </dl>
          <Link to="/dashboard/leki" className={editLinkClassName}>
            Zmień ten lek
          </Link>
          <PharmacyLink name={event.medication.name} />
        </>
      )}

      {event.kind === "screening" && (
        <dl className="flex flex-col gap-2">
          <Field label="Termin">{describeDue(event.screening)}</Field>
          <Field label="Dlaczego">{event.screening.rationale}</Field>
          {event.screening.nfzBenefit !== null && (
            <Field label="W ramach NFZ">{event.screening.nfzBenefit}</Field>
          )}
        </dl>
      )}

      {event.kind === "done" && (
        <dl className="flex flex-col gap-2">
          <Field label="Wykonane">
            {formatScreeningDate(event.entry.performedOn)}
          </Field>
          {event.entry.notes !== null && (
            <Field label="Twoja notatka">{event.entry.notes}</Field>
          )}
        </dl>
      )}
    </div>
  );
}
