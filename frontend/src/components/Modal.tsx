import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Szersze okienko dla tresci, ktora sama w sobie jest dokumentem - w 34rem
  // podglad PDF-u ma mniej miejsca niz pasek narzedzi samej przegladarki.
  wide?: boolean;
};

// Natywny <dialog>: Esc, blokade przewijania tla i trzymanie fokusu w okienku
// daje przegladarka, wiec nie potrzebujemy do tego biblioteki.
export function Modal({ title, onClose, children, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Bez tego Esc zamyka okienko w przegladarce, a React dalej uwaza je za otwarte.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Na telefonie okienko zajmuje caly ekran - tresc i tak nie miesci sie w
      // kartce na srodku, a mniejsze okno zostawia tylko waski pasek do czytania.
      className={`m-0 h-full max-h-full w-full max-w-none overflow-y-auto bg-white backdrop:bg-slate-900/40 sm:m-auto sm:h-auto sm:max-h-[85vh] sm:rounded-card ${
        wide
          ? "sm:w-[min(56rem,calc(100vw-2rem))]"
          : "sm:w-[min(34rem,calc(100vw-2rem))]"
      }`}
    >
      <div className="sticky top-0 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <h2 id={titleId} className="min-w-0 flex-1 text-lg font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-field px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <X aria-hidden="true" className="size-4" />
          Zamknij
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
