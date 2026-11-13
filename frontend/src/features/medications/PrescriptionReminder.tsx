import { CalendarClock, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { addDays, longDateLabel, toIsoDate } from "@/domain";
import { buildIcs, downloadIcs } from "@/lib/calendarEvent";

type Props = {
  medicationName: string;
};

// Terminy waznosci e-recepty wg pacjent.gov.pl. Domyslnie 30 dni.
const VALIDITY = [
  { days: 30, label: "30 dni (zwykła recepta)" },
  { days: 7, label: "7 dni (antybiotyk)" },
  { days: 120, label: "120 dni" },
  { days: 365, label: "365 dni (recepta roczna)" },
];

// Przy krotkiej recepcie tydzien wyprzedzenia wypadalby przed jej wystawieniem.
function remindOn(
  expires: string,
  validityDays: number,
  today: string,
): string {
  const lead = validityDays >= 30 ? 7 : 2;
  const day = addDays(expires, -lead);
  return day < today ? today : day;
}

export function PrescriptionReminder({ medicationName }: Props) {
  const today = toIsoDate(new Date());
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState(today);
  const [validityDays, setValidityDays] = useState(30);

  const expires = addDays(issued, validityDays);
  const reminder = remindOn(expires, validityDays, today);

  function addToCalendar(): void {
    downloadIcs(
      "przypomnienie-recepta.ics",
      buildIcs({
        title: `Wykup receptę: ${medicationName}`,
        description: `Recepta jest ważna do ${longDateLabel(expires)}.`,
        day: reminder,
      }),
    );
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-field border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
      >
        <CalendarClock aria-hidden="true" className="size-4" />
        Mam receptę — przypomnij o wykupieniu
      </button>

      {open && (
        <Modal
          title={`Recepta: ${medicationName}`}
          onClose={() => setOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Kiedy lekarz wystawił receptę?
              <input
                type="date"
                value={issued}
                max={today}
                onChange={(event) => setIssued(event.target.value)}
                className="min-h-11 self-start rounded-field border border-slate-300 bg-white px-3 py-2 font-normal"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Jak długo jest ważna?
              <select
                value={validityDays}
                onChange={(event) =>
                  setValidityDays(Number(event.target.value))
                }
                className="min-h-11 self-start rounded-field border border-slate-300 bg-white px-3 py-2 font-normal"
              >
                {VALIDITY.map((option) => (
                  <option key={option.days} value={option.days}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <p role="status" className="text-sm text-slate-600">
              Recepta jest ważna do <strong>{longDateLabel(expires)}</strong>.
              Przypomnimy {longDateLabel(reminder)}.
            </p>

            <button
              type="button"
              onClick={addToCalendar}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-field bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
            >
              <CalendarPlus aria-hidden="true" className="size-5" />
              Dodaj do kalendarza
            </button>

            <p className="text-sm text-slate-500">
              Nie pytamy o kod recepty i nie zapisujemy tej daty u siebie —
              przypomnienie trafia tylko do Twojego kalendarza. Jeśli nie znasz
              terminu, sprawdź go w informacji o e-recepcie.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
