import { Brain, Download, ExternalLink, Mail, Printer } from "lucide-react";
import { useState } from "react";

type Props = {
  file: File;
  // Adres tworzy i zwalnia DocumentMock przy otwieraniu i zamykaniu okienka.
  // W efekcie nie mozemy: StrictMode montuje komponent dwa razy, wiec adres
  // zostalby zwolniony po pierwszym montowaniu i podglad bylby pusty w dev.
  url: string;
};

const ACTION =
  "inline-flex min-h-11 items-center gap-2 rounded-field border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700";

// Co stoi za kazdym przyciskiem, ktorego nie da sie dzis zrobic naprawde.
const PLANNED: Record<string, string> = {
  mail: "Docelowo otworzy się okno z adresatem i załączonym plikiem. Wynik badania to dane o zdrowiu, więc wysyłka musi być świadomym działaniem — nigdy automatem.",
  ai: "Docelowo pojawi się tu streszczenie wyniku prostym językiem i podpowiedź, o co dopytać lekarza. Celowo nie pokazujemy zmyślonego streszczenia — przy wyniku badania byłoby to mylące.",
};

const IKP = "https://pacjent.gov.pl/internetowe-konto-pacjenta";

export function DocumentDetails({ file, url }: Props) {
  const [planned, setPlanned] = useState<string | null>(null);

  function print(): void {
    const opened = window.open(url, "_blank");
    opened?.addEventListener("load", () => opened.print());
  }

  const isImage = file.type.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  return (
    <div className="flex flex-col gap-5">
      {isImage && (
        <img
          src={url}
          alt={`Podgląd: ${file.name}`}
          className="max-h-[50vh] w-full rounded-field border border-slate-200 object-contain"
        />
      )}

      {isPdf && (
        <iframe
          src={`${url}#navpanes=0&view=FitH`}
          title={`Podgląd: ${file.name}`}
          className="h-[50vh] w-full rounded-field border border-slate-200"
        />
      )}

      {!isImage && !isPdf && (
        <p className="text-sm text-slate-600">
          Tego formatu nie pokażemy w podglądzie, ale możesz go pobrać.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <a href={url} download={file.name} className={ACTION}>
          <Download aria-hidden="true" className="size-5" />
          Pobierz
        </a>
        <button type="button" onClick={print} className={ACTION}>
          <Printer aria-hidden="true" className="size-5" />
          Drukuj
        </button>
        <button
          type="button"
          onClick={() => setPlanned(PLANNED.mail)}
          className={ACTION}
        >
          <Mail aria-hidden="true" className="size-5" />
          Wyślij e-mailem
        </button>
        <a href={IKP} target="_blank" rel="noreferrer" className={ACTION}>
          <ExternalLink aria-hidden="true" className="size-5" />
          Otwórz IKP
        </a>
        <button
          type="button"
          onClick={() => setPlanned(PLANNED.ai)}
          className={ACTION}
        >
          <Brain aria-hidden="true" className="size-5" />
          Wyjaśnij wynik
        </button>
      </div>

      {planned !== null && (
        <p
          role="status"
          className="rounded-field bg-warning-50 px-3 py-2 text-sm text-warning-700"
        >
          {planned}
        </p>
      )}

      <p className="text-sm text-slate-500">
        Podgląd, pobieranie i drukowanie działają naprawdę — plik jest w tej
        karcie przeglądarki. Do Internetowego Konta Pacjenta nie da się dołączyć
        własnego skanu: trafiają tam tylko dokumenty wysłane przez placówkę,
        która wykonała badanie.
      </p>
    </div>
  );
}
