import { Accessibility, MapPin, Phone } from "lucide-react";
import { useState } from "react";
import {
  ACCESS_FEATURES,
  fetchNfzQueues,
  NfzBusyError,
  type NfzQueue,
} from "@/data/nfzQueues";
import { formatWaitDays, VOIVODESHIPS, type VoivodeshipCode } from "@/domain";
import {
  loadAccessNeeds,
  loadVoivodeship,
  saveVoivodeship,
} from "@/lib/draftStorage";

type Props = {
  benefit: string;
};

type Status = "idle" | "loading" | "ok" | "busy" | "error";

function meetsNeeds(queue: NfzQueue, needs: string[]): boolean {
  return needs.every((need) =>
    queue.accessible.some((feature) => feature === need),
  );
}

// Stabilny sort, wiec w obu grupach zostaje kolejnosc wg czasu oczekiwania.
function sortForNeeds(queues: NfzQueue[], needs: string[]): NfzQueue[] {
  if (needs.length === 0) {
    return queues;
  }
  return [...queues].sort(
    (first, second) =>
      Number(meetsNeeds(second, needs)) - Number(meetsNeeds(first, needs)),
  );
}

const MESSAGES: Record<string, string> = {
  busy: "Spróbuj ponownie za chwilę.",
  error: "Nie udało się pobrać terminów z NFZ. Spróbuj ponownie później.",
};

// Placowki i czas oczekiwania prosto z API NFZ. Nie pytamy o lokalizacje
// przegladarki: wojewodztwo uzytkownik podal w kreatorze, a tu moze je zmienic.
export function NfzQueues({ benefit }: Props) {
  const [province, setProvince] = useState<VoivodeshipCode>(
    () => loadVoivodeship() ?? "07",
  );
  const [status, setStatus] = useState<Status>("idle");
  const [queues, setQueues] = useState<NfzQueue[]>([]);
  // Z ustawien: placowki, ktore maja to, czego uzytkownik potrzebuje, ida na gore.
  const needs = loadAccessNeeds();

  function load(code: VoivodeshipCode): void {
    setStatus("loading");
    fetchNfzQueues(benefit, code)
      .then((found) => {
        setQueues(sortForNeeds(found, needs));
        setStatus("ok");
      })
      .catch((problem: unknown) => {
        setStatus(problem instanceof NfzBusyError ? "busy" : "error");
      });
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`woj-${benefit}`}
            className="text-sm font-medium text-slate-600"
          >
            Województwo
          </label>
          <select
            id={`woj-${benefit}`}
            value={province}
            onChange={(event) => {
              const code = event.target.value as VoivodeshipCode;
              setProvince(code);
              saveVoivodeship(code);
              setStatus("idle");
              setQueues([]);
            }}
            className="min-h-11 rounded-field border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {VOIVODESHIPS.map((voivodeship) => (
              <option key={voivodeship.code} value={voivodeship.code}>
                {voivodeship.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          disabled={status === "loading"}
          onClick={() => load(province)}
          className="inline-flex min-h-11 items-center gap-2 rounded-field border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:border-slate-300 disabled:text-slate-400"
        >
          <MapPin aria-hidden="true" className="size-4" />
          {status === "loading" ? "Sprawdzam…" : "Gdzie to zrobić na NFZ"}
        </button>
      </div>

      {MESSAGES[status] !== undefined && (
        <p role="alert" className="text-sm text-danger-700">
          {MESSAGES[status]}
        </p>
      )}

      {status === "ok" && queues.length === 0 && (
        <p className="text-sm text-slate-600">
          NFZ nie ma kolejek dla tego badania w tym województwie. Spróbuj
          sąsiedniego albo zapytaj w swojej przychodni.
        </p>
      )}

      {status === "ok" && queues.length > 0 && (
        <>
          <ul className="flex flex-col gap-3">
            {queues.slice(0, 5).map((queue) => (
              <li
                key={queue.key}
                className="flex flex-col gap-1 rounded-field bg-slate-50 p-3"
              >
                <p className="font-medium">{queue.provider}</p>
                {queue.locality !== null && (
                  <p className="text-sm text-slate-600">
                    {queue.locality}
                    {queue.address !== null && `, ${queue.address}`}
                  </p>
                )}
                <p className="text-sm font-medium">
                  {queue.waitDays === null
                    ? "Brak danych o czasie oczekiwania"
                    : `Czekasz ${formatWaitDays(queue.waitDays)}`}
                  {queue.awaiting !== null && ` · w kolejce ${queue.awaiting}`}
                </p>
                {queue.phone !== null && (
                  <a
                    href={`tel:${queue.phone.replace(/\s/g, "")}`}
                    className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-brand-700 hover:underline"
                  >
                    <Phone aria-hidden="true" className="size-4" />
                    {queue.phone}
                  </a>
                )}
                {queue.accessible.length > 0 && (
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Accessibility aria-hidden="true" className="size-4" />
                    {queue.accessible
                      .map((feature) => ACCESS_FEATURES[feature])
                      .join(", ")}
                    {needs.length > 0 && meetsNeeds(queue, needs) && (
                      <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                        spełnia Twoje wymagania
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500">
            Dane z API NFZ „terminy leczenia", przypadek stabilny. Pokazujemy
            pięć placówek z najkrótszym oczekiwaniem.
          </p>
        </>
      )}
    </div>
  );
}
