import { ExternalLink } from "lucide-react";
import { pharmacySearchUrl } from "@/lib/pharmacySearch";

type Props = {
  name: string;
  // Na liscie lekow przypis powtarzalby sie pod kazda karta.
  note?: boolean;
};

export function PharmacyLink({ name, note = true }: Props) {
  return (
    <div className="flex flex-col gap-1 border-t border-slate-200 pt-3">
      <a
        href={pharmacySearchUrl(name)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-field border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100"
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        Skończył się? Sprawdź, gdzie kupić
      </a>
      {note && (
        <p className="text-sm text-slate-500">
          Otworzy się wyszukiwarka w nowej karcie. Sprzedaż wysyłkowa dotyczy
          leków bez recepty — lek na receptę odbierzesz w aptece.
        </p>
      )}
    </div>
  );
}
