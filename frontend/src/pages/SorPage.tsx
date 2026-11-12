import { Clock, MapPin, Phone, Users } from "lucide-react";
import { useState } from "react";
import { fetchNearestSor, type NearestSor } from "@/data/sor";
import { formatDistance, formatFetchedAt, formatWait } from "@/domain";
import { ApiError } from "@/lib/api";

type Status =
  | "idle"
  | "locating"
  | "loading"
  | "ok"
  | "denied"
  | "unavailable"
  | "error";

const MESSAGES: Record<string, string> = {
  denied:
    "Nie mamy zgody na odczyt lokalizacji. Włącz ją w ustawieniach przeglądarki i spróbuj ponownie.",
  unavailable:
    "Kolejki są chwilowo niedostępne. Spróbuj później albo zadzwoń pod 112.",
  error: "Nie udało się pobrać kolejek. Spróbuj ponownie za chwilę.",
};

export function SorPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<NearestSor | null>(null);

  function load(latitude: number, longitude: number): void {
    setStatus("loading");
    fetchNearestSor(latitude, longitude)
      .then((data) => {
        setResult(data);
        setStatus("ok");
      })
      .catch((problem: unknown) => {
        // 503 znaczy, ze backend nie ma klucza do kolejkisor.pl - to inna sytuacja
        // niz awaria i uzytkownik nie ma czego ponawiac.
        setStatus(
          problem instanceof ApiError && problem.status === 503
            ? "unavailable"
            : "error",
        );
      });
  }

  function findNearest(): void {
    // Przegladarka bez geolokalizacji albo strona po http - traktujemy tak samo
    // jak odmowe, bo dla uzytkownika skutek jest ten sam.
    if (!("geolocation" in navigator)) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) =>
        load(position.coords.latitude, position.coords.longitude),
      () => setStatus("denied"),
      { timeout: 10000 },
    );
  }

  const busy = status === "locating" || status === "loading";

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Kolejki na SOR</h1>

      {/* Numer alarmowy nad wszystkim: jesli dzieje sie cos powaznego, nikt nie
          powinien najpierw przegladac listy szpitali. */}
      <div className="flex flex-col gap-2 rounded-card border-2 border-danger-200 bg-danger-50 p-4">
        <p className="font-semibold text-danger-700">
          W stanie zagrożenia życia dzwoń pod 112
        </p>
        <a
          href="tel:112"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-field bg-danger-600 px-4 py-2 font-semibold text-white hover:bg-danger-700"
        >
          <Phone aria-hidden="true" className="size-5" />
          Zadzwoń pod 112
        </a>
      </div>

      <p className="text-slate-600">
        Pokażemy najbliższe szpitalne oddziały ratunkowe i szacowany czas
        oczekiwania. Potrzebujemy do tego Twojej lokalizacji — pytamy o nią
        dopiero po kliknięciu.
      </p>

      <button
        type="button"
        onClick={findNearest}
        disabled={busy}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-field bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700 disabled:bg-slate-300"
      >
        <MapPin aria-hidden="true" className="size-5" />
        {status === "locating"
          ? "Sprawdzam, gdzie jesteś…"
          : status === "loading"
            ? "Sprawdzam kolejki…"
            : "Pokaż najbliższe SOR-y"}
      </button>

      {MESSAGES[status] !== undefined && (
        <p role="alert" className="text-danger-700">
          {MESSAGES[status]}
        </p>
      )}

      {status === "ok" && result !== null && (
        <>
          <p className="text-sm text-slate-500">
            Dane z kolejkisor.pl, pobrane o {formatFetchedAt(result.fetchedAt)}.
          </p>

          {result.hospitals.length === 0 ? (
            <p className="text-slate-600">
              Nie znaleźliśmy SOR-ów w Twojej okolicy.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {result.hospitals.map((hospital) => (
                <li
                  key={hospital.id}
                  className="flex flex-col gap-1 rounded-card border border-slate-200 bg-white p-4"
                >
                  <h2 className="font-semibold">{hospital.name}</h2>
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin aria-hidden="true" className="size-4" />
                    {hospital.city} — {formatDistance(hospital.distanceKm)}
                  </p>
                  {hospital.waitMinutes !== null && (
                    <p className="flex items-center gap-1.5 font-medium">
                      <Clock aria-hidden="true" className="size-4" />
                      Czas oczekiwania: {formatWait(hospital.waitMinutes)}
                    </p>
                  )}
                  {hospital.totalPatients !== null && (
                    <p className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Users aria-hidden="true" className="size-4" />
                      {hospital.totalPatients} osób w kolejce
                      {hospital.loadCategory !== null &&
                        ` — ${hospital.loadCategory}`}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
