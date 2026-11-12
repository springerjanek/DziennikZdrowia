import { MapPin, Stethoscope } from "lucide-react";
import { useId, useState } from "react";
import { fetchPozClinics, type PozClinic } from "@/data/nfzContracts";
import { NfzBusyError } from "@/data/nfzQueues";
import { VOIVODESHIPS, type VoivodeshipCode } from "@/domain";
import {
  loadLocality,
  loadVoivodeship,
  saveLocality,
  saveVoivodeship,
} from "@/lib/draftStorage";
import { mapSearchUrl } from "@/lib/mapSearch";

type Status = "idle" | "loading" | "ok" | "busy" | "error";

const MESSAGES: Record<string, string> = {
  busy: "Spróbuj ponownie za chwilę.",
  error: "Nie udało się pobrać przychodni z NFZ. Spróbuj ponownie później.",
};

const SHOWN = 10;
const FIELD =
  "min-h-11 rounded-field border border-slate-300 bg-white px-3 py-2 text-sm";

// Przychodnie rodzinne z umowa z NFZ w miejscowosci uzytkownika. Dla badan,
// ktore zleca lekarz rodzinny, NFZ nie prowadzi kolejek, wiec zamiast czasu
// oczekiwania pokazujemy, gdzie w ogole mozna sie zglosic.
export function PozClinics() {
  const fieldId = useId();
  const [province, setProvince] = useState<VoivodeshipCode>(
    () => loadVoivodeship() ?? "07",
  );
  const [place, setPlace] = useState(() => loadLocality());
  const [status, setStatus] = useState<Status>("idle");
  const [clinics, setClinics] = useState<PozClinic[]>([]);
  const [total, setTotal] = useState(0);

  const trimmed = place.trim();

  function reset(): void {
    setStatus("idle");
    setClinics([]);
  }

  function load(): void {
    setStatus("loading");
    saveLocality(trimmed);
    fetchPozClinics(province, trimmed)
      .then((found) => {
        setClinics(found.clinics);
        setTotal(found.total);
        setStatus("ok");
      })
      .catch((problem: unknown) => {
        setStatus(problem instanceof NfzBusyError ? "busy" : "error");
      });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${fieldId}-woj`}
            className="text-sm font-medium text-slate-600"
          >
            Województwo
          </label>
          <select
            id={`${fieldId}-woj`}
            value={province}
            onChange={(event) => {
              const code = event.target.value as VoivodeshipCode;
              setProvince(code);
              saveVoivodeship(code);
              reset();
            }}
            className={FIELD}
          >
            {VOIVODESHIPS.map((voivodeship) => (
              <option key={voivodeship.code} value={voivodeship.code}>
                {voivodeship.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`${fieldId}-miejsc`}
            className="text-sm font-medium text-slate-600"
          >
            Miejscowość
          </label>
          <input
            id={`${fieldId}-miejsc`}
            type="text"
            maxLength={120}
            autoComplete="address-level2"
            value={place}
            onChange={(event) => {
              setPlace(event.target.value);
              reset();
            }}
            className={FIELD}
          />
        </div>

        <button
          type="submit"
          disabled={status === "loading" || trimmed === ""}
          className="inline-flex min-h-11 items-center gap-2 rounded-field border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:border-slate-300 disabled:text-slate-400"
        >
          <Stethoscope aria-hidden="true" className="size-4" />
          Znajdź przychodnię rodzinną
        </button>
      </form>

      {MESSAGES[status] !== undefined && (
        <p role="alert" className="text-sm text-danger-700">
          {MESSAGES[status]}
        </p>
      )}

      {status === "ok" && clinics.length === 0 && (
        <p className="text-sm text-slate-600">
          NFZ nie ma w tym województwie przychodni rodzinnej w miejscowości „
          {trimmed}". Sprawdź pisownię albo wpisz większą miejscowość w pobliżu.
        </p>
      )}

      {status === "ok" && clinics.length > 0 && (
        <>
          <ul className="flex flex-col gap-2">
            {clinics.slice(0, SHOWN).map((clinic) => (
              <li
                key={clinic.code}
                className="flex flex-wrap items-center gap-2 rounded-field bg-slate-50 p-3"
              >
                <p className="min-w-0 flex-1 text-sm font-medium">
                  {clinic.name}
                </p>
                <a
                  href={mapSearchUrl(clinic.name, clinic.place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Pokaż na mapie: ${clinic.name}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
                >
                  <MapPin aria-hidden="true" className="size-4" />
                  Pokaż na mapie
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">
            Placówki z umową NFZ na podstawową opiekę zdrowotną
            {total > SHOWN && ` (pokazujemy ${SHOWN} z ${total} umów)`}. Jeśli
            masz już swoją przychodnię, zgłoś się tam — badania na NFZ zleca
            lekarz rodzinny.
          </p>
        </>
      )}
    </div>
  );
}
