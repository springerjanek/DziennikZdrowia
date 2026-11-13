import { Printer } from "lucide-react";
import { useLoaderData } from "react-router";
import { EanBarcode } from "@/components/EanBarcode";
import { QrCode } from "@/components/QrCode";
import {
  CHRONIC_CONDITIONS,
  dosageLine,
  latestPerRule,
  longDateLabel,
  medicationListText,
  toEan13,
  toIsoDate,
} from "@/domain";
import type { doctorCardLoader } from "./doctorCardLoader";

function conditionLabel(id: string): string {
  return (
    CHRONIC_CONDITIONS.find((condition) => condition.id === id)?.label ?? id
  );
}

export function DoctorCardPage() {
  const { medications, history, profile } =
    useLoaderData<typeof doctorCardLoader>();
  const today = toIsoDate(new Date());
  const screenings = latestPerRule(history);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Karta dla lekarza</h1>
          <p className="text-slate-600">
            Jedna kartka z Twoimi lekami i badaniami — do pokazania lekarzowi,
            farmaceucie albo ratownikowi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-field bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700"
        >
          <Printer aria-hidden="true" className="size-5" />
          Drukuj
        </button>
      </div>

      <article className="flex flex-col gap-6 rounded-card border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <header className="flex flex-col gap-1 border-b border-slate-300 pb-3">
          <h2 className="text-xl font-bold">Leki i badania pacjenta</h2>
          <p className="text-sm text-slate-600">
            Stan na {longDateLabel(today)}
            {profile.birthYear !== null &&
              ` · rok urodzenia ${profile.birthYear}`}
          </p>
          <p className="text-sm">
            Imię i nazwisko:{" "}
            <span className="inline-block w-64 border-b border-dotted border-slate-400">
              &nbsp;
            </span>
          </p>
        </header>

        {profile.conditions.length > 0 && (
          <section className="flex flex-col gap-1">
            <h3 className="font-semibold">Choroby przewlekłe</h3>
            <p>{profile.conditions.map(conditionLabel).join(", ")}</p>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Przyjmowane leki</h3>
          {medications.length === 0 ? (
            <p className="text-slate-600">Brak zapisanych leków.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-200">
              {medications.map((medication) => (
                <li
                  key={medication.id}
                  className="flex break-inside-avoid items-center gap-4 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {medication.name}
                      {medication.activeSubstance !== null && (
                        <span className="font-normal text-slate-600">
                          {" "}
                          ({medication.activeSubstance})
                        </span>
                      )}
                    </p>
                    <p className="text-sm">{dosageLine(medication)}</p>
                    {medication.notes !== null && (
                      <p className="text-sm text-slate-600">
                        {medication.notes}
                      </p>
                    )}
                  </div>
                  {medication.gtin !== null &&
                    toEan13(medication.gtin) !== null && (
                      <div className="w-32 shrink-0">
                        <EanBarcode gtin={medication.gtin} />
                      </div>
                    )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {screenings.length > 0 && (
          <section className="flex break-inside-avoid flex-col gap-2">
            <h3 className="font-semibold">Ostatnie badania</h3>
            <ul className="flex flex-col gap-1">
              {screenings.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="font-medium">{entry.ruleLabel}</span> —{" "}
                  {longDateLabel(entry.performedOn)}
                  {entry.notes !== null && (
                    <span className="text-slate-600"> · {entry.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {medications.length > 0 && (
          <section className="flex break-inside-avoid items-center gap-4 border-t border-slate-300 pt-4">
            <QrCode
              text={medicationListText(medications, today)}
              label="Kod QR z listą leków"
            />
            <p className="text-sm text-slate-600">
              Ten kod zawiera listę leków z dawkowaniem. Wystarczy skierować na
              niego aparat dowolnego telefonu — nie potrzeba internetu ani
              żadnej aplikacji.
            </p>
          </section>
        )}

        <footer className="border-t border-slate-300 pt-3 text-xs text-slate-500">
          Listę prowadzi pacjent samodzielnie w aplikacji Dziennik Zdrowia. To
          nie jest dokumentacja medyczna ani zalecenie lekarskie.
        </footer>
      </article>
    </section>
  );
}
