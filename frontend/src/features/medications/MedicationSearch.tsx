import { ScanBarcode } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";
import { MIN_QUERY_LENGTH, searchMedications } from "@/data/medications";
import {
  formatEan,
  formatPackSaving,
  formatPackSurcharge,
  formatSurcharge,
  groupByName,
  manualMedication,
  medicationKey,
  needsEanToTellApart,
  packCountLabel,
  reimbursementLabel,
  type Medication,
  type MedicationGroup,
} from "@/domain";
import { canScanBarcodes } from "@/lib/barcodeDetector";
import { BarcodeScanner } from "./BarcodeScanner";

const DEBOUNCE_MS = 300;

// Numer z kodu kreskowego nie jest nazwa leku - nie proponujemy dodania go recznie.
function looksLikeBarcode(text: string): boolean {
  return /^\d{8,14}$/.test(text);
}

type Search =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; query: string; results: Medication[] }
  | { kind: "error" };

type OptionButtonProps = {
  title: string;
  subtitle: string;
  added: boolean;
  onClick: () => void;
};

function OptionButton({ title, subtitle, added, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      disabled={added}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-3 rounded-field border px-3 py-2.5 text-left ${
        added
          ? "border-brand-200 bg-brand-50"
          : "border-slate-200 bg-white hover:border-brand-400 hover:bg-brand-50"
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-slate-500">{subtitle}</span>
      </span>
      {added && (
        <span className="shrink-0 text-sm font-semibold text-brand-700">
          dodany
        </span>
      )}
    </button>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type GroupRowProps = {
  group: MedicationGroup;
  open: boolean;
  onToggle: () => void;
  isAdded: (medication: Medication) => boolean;
  onAdd: (medication: Medication) => void;
};

// Jedna pozycja listy dla leku, ktory ma kilka opakowan. Roznia sie tylko liczba sztuk
// i doplata - poziom refundacji i uprawnienia sa w calej grupie takie same.
function GroupRow({ group, open, onToggle, isAdded, onAdd }: GroupRowProps) {
  const surcharge = formatSurcharge(group.options);
  const subtitle = [
    group.activeSubstance,
    packCountLabel(group.options.length),
    surcharge === null ? null : `zapłacisz ${surcharge} za opakowanie`,
  ]
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-3 rounded-field border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-brand-400 hover:bg-brand-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{group.name}</span>
          <span className="block truncate text-sm text-slate-500">
            {subtitle}
          </span>
        </span>
        {group.options.some(isAdded) && (
          <span className="shrink-0 text-sm font-semibold text-brand-700">
            dodany
          </span>
        )}
        <Chevron open={open} />
      </button>

      {open && (
        <ul className="flex flex-col gap-1 pl-4">
          {group.options.map((pack) => {
            const packSurcharge = formatPackSurcharge(pack);
            const saving = formatPackSaving(pack);
            const subtitle = [
              packSurcharge === null
                ? reimbursementLabel(pack.reimbursement.level)
                : saving === null
                  ? `zapłacisz ${packSurcharge}`
                  : `zapłacisz ${packSurcharge} zamiast ${saving}`,
              pack.ean !== null && needsEanToTellApart(group.options, pack)
                ? `kod EAN ${formatEan(pack.ean)}`
                : null,
            ]
              .filter((part) => part !== null)
              .join(" · ");

            return (
              <li key={medicationKey(pack)}>
                <OptionButton
                  title={pack.packSize ?? "opakowanie"}
                  subtitle={subtitle}
                  added={isAdded(pack)}
                  onClick={() => onAdd(pack)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// Udaje trzy wiersze wynikow: te same wymiary co przyciski ponizej, zeby lista
// nie podskakiwala, gdy dane dojda. Pasek tekstowy jest dla czytnikow ekranu,
// bo sam ksztalt nic im nie mowi.
function ResultsSkeleton() {
  return (
    <div role="status" className="flex animate-pulse flex-col gap-1">
      <span className="sr-only">Szukam…</span>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="rounded-field border border-slate-200 bg-white px-3 py-2.5"
        >
          <div className="h-4 w-2/5 rounded bg-slate-200" />
          <div className="mt-1.5 h-3 w-3/5 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

type MedicationSearchProps = {
  isAdded: (medication: Medication) => boolean;
  onPick: (medication: Medication) => void;
  autoFocus?: boolean;
};

// Wyszukiwarka wykazu MZ: ta sama w onboardingu i w okienku "Dodaj lek".
export function MedicationSearch({
  isAdded,
  onPick,
  autoFocus = false,
}: MedicationSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ kind: "idle" });
  // Nazwa rozwinietej grupy; naraz otwarta jest jedna, zeby lista nie urosla z powrotem.
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Wyszukiwarka znajduje lek po samym numerze z kodu, wiec zeskanowany numer
  // wystarczy wpisac w pole. useCallback, bo skaner trzyma te funkcje w
  // zaleznosciach efektu - nowa przy kazdym renderze restartowalaby kamere.
  const handleScan = useCallback((code: string) => {
    setQuery(code);
    setScanning(false);
  }, []);

  useEffect(() => {
    const needle = query.trim();
    if (needle.length < MIN_QUERY_LENGTH) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ kind: "loading" });
      searchMedications(needle, controller.signal)
        .then((results) => setSearch({ kind: "done", query: needle, results }))
        .catch(() => {
          // Anulowane zapytanie nie jest bledem - zaraz poleci nowe.
          if (!controller.signal.aborted) {
            setSearch({ kind: "error" });
          }
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const needle = query.trim();
  // Stan wyszukiwania zostaje po skasowaniu pola, wiec o tym, co widac, decyduje to,
  // co user ma teraz wpisane - inaczej po wyczyszczeniu wisialoby "Szukam..." albo stare wyniki.
  const searching = needle.length >= MIN_QUERY_LENGTH;
  const results = searching && search.kind === "done" ? search.results : [];
  // Wykaz ma osobny wiersz na kazde opakowanie - bez tego jedno zapytanie daje 20 pozycji.
  const groups = groupByName(results);
  // "Brak wynikow" pokazujemy tylko dla tego, co user ma teraz w polu.
  const nothingFound =
    searching &&
    search.kind === "done" &&
    search.query === needle &&
    results.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium">
          Szukaj leku
        </label>
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="nazwa z pudełka, np. Metformax"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-field border border-slate-300 bg-white px-3 py-2.5 placeholder:text-slate-400"
        />
        <p className="text-sm text-slate-500">
          Możesz też wpisać numer spod kodu kreskowego na pudełku.
        </p>
        {canScanBarcodes() && (
          <button
            type="button"
            aria-expanded={scanning}
            onClick={() => setScanning(!scanning)}
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-field border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <ScanBarcode aria-hidden="true" className="size-5" />
            {scanning ? "Zamknij aparat" : "Zeskanuj kod z pudełka"}
          </button>
        )}
        {scanning && <BarcodeScanner onDetected={handleScan} />}
      </div>

      {searching && search.kind === "loading" && <ResultsSkeleton />}

      {searching && search.kind === "error" && (
        <p role="alert" className="text-sm text-danger-600">
          Nie udało się połączyć z wyszukiwarką. Lek możesz dodać ręcznie.
        </p>
      )}

      {groups.length > 0 && (
        <ul className="flex flex-col gap-1">
          {groups.map((group) => (
            <li key={group.name}>
              {group.options.length === 1 ? (
                <OptionButton
                  title={group.name}
                  subtitle={[group.options[0].packSize, group.activeSubstance]
                    .filter((part) => part !== null)
                    .join(" · ")}
                  added={isAdded(group.options[0])}
                  onClick={() => onPick(group.options[0])}
                />
              ) : (
                <GroupRow
                  group={group}
                  open={expanded === group.name}
                  onToggle={() =>
                    setExpanded(expanded === group.name ? null : group.name)
                  }
                  isAdded={isAdded}
                  onAdd={onPick}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {searching && nothingFound && looksLikeBarcode(needle) && (
        <p className="rounded-card border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Nie mamy leku o kodzie {needle}. W wykazie są głównie leki na
          receptę — lek bez recepty wpisz po nazwie z pudełka.
        </p>
      )}

      {searching &&
        !looksLikeBarcode(needle) &&
        (nothingFound || search.kind === "error") && (
          <div className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-600">
              Nie znaleźliśmy „{needle}" w wykazie. Możesz dodać ten lek sam — nie
              pokażemy wtedy refundacji.
            </p>
            <button
              type="button"
              onClick={() => {
                onPick(manualMedication(needle));
                setQuery("");
              }}
              className="inline-flex min-h-11 items-center self-start rounded-field border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Dodaj „{needle}"
            </button>
          </div>
        )}
    </div>
  );
}
