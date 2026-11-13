import { FileText, Paperclip, Trash2 } from "lucide-react";
import { useState } from "react";

type Picked = {
  key: string;
  name: string;
  size: number;
};

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} MB`;
}

// Szkic funkcji, nie funkcja: pliki zostaja w pamieci karty i znikaja przy
// odswiezeniu. Prawdziwe zalaczniki wymagaja endpointu, miejsca na pliki i
// rozstrzygniecia, co sie z nimi dzieje przy usunieciu konta - wynik badania
// to dane o zdrowiu z art. 9 RODO, wiec nie wrzucamy ich nigdzie "na probe".
export function DocumentMock() {
  const [picked, setPicked] = useState<Picked[]>([]);

  return (
    <section className="flex flex-col gap-3 rounded-card border border-dashed border-slate-400 bg-slate-50 p-4">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Paperclip aria-hidden="true" className="size-5" />
          Dokumentacja medyczna
        </h2>
        <p className="inline-flex self-start rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700">
          wersja demonstracyjna
        </p>
      </div>

      <p className="text-sm text-slate-600">
        Tak ma wyglądać dołączanie wyników badań. Na razie{" "}
        <strong>pliki nie są nigdzie wysyłane</strong> — zostają w tej karcie
        przeglądarki i znikają po odświeżeniu strony.
      </p>

      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-field border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-100">
        <FileText aria-hidden="true" className="size-5" />
        Wybierz plik
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="sr-only"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])].map((file) => ({
              key: `${file.name}-${file.lastModified}`,
              name: file.name,
              size: file.size,
            }));
            setPicked((current) => [...current, ...files]);
            event.target.value = "";
          }}
        />
      </label>

      {picked.length > 0 && (
        <ul className="flex flex-col gap-2">
          {picked.map((file) => (
            <li key={file.key} className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-slate-500">({formatSize(file.size)})</span>
              </span>
              <button
                type="button"
                aria-label={`Usuń ${file.name}`}
                onClick={() =>
                  setPicked((current) =>
                    current.filter((other) => other.key !== file.key),
                  )
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-field border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-danger-600 hover:bg-danger-50 hover:text-danger-700"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Usuń
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-slate-500">
        Żeby to działało naprawdę, backend potrzebuje miejsca na pliki i
        odpowiedzi na pytanie, co się z nimi dzieje przy usunięciu konta. Wynik
        badania to dane o zdrowiu (art. 9 RODO), więc nie trzymamy ich „na
        próbę".
      </p>
    </section>
  );
}
