import { Check, LogOut } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { signOut } from "@/auth/session";
import {
  FONT_SCALES,
  loadFontScale,
  saveFontScale,
  type FontScaleId,
} from "@/lib/fontScale";

export function SettingsPage() {
  const navigate = useNavigate();
  const [fontScale, setFontScale] = useState<FontScaleId>(loadFontScale);

  function chooseFontScale(id: FontScaleId): void {
    setFontScale(id);
    saveFontScale(id);
  }

  function handleSignOut(): void {
    signOut()
      .catch(() => undefined)
      .then(() => navigate("/konto", { replace: true }));
  }

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Ustawienia</h1>

      <section className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Rozmiar tekstu</h2>
        <p className="text-sm text-slate-600">
          Powiększamy nie tylko litery, ale też przyciski i odstępy. Wybór
          zostaje w tej przeglądarce.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          {FONT_SCALES.map((scale) => {
            const chosen = scale.id === fontScale;
            return (
              <button
                key={scale.id}
                type="button"
                aria-pressed={chosen}
                onClick={() => chooseFontScale(scale.id)}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-field border px-3 py-2 font-medium ${
                  chosen
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-slate-300 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {/* Ikona, a nie sam kolor ramki - inaczej przy slabym wzroku albo
                    daltonizmie nie widac, ktory rozmiar jest wlaczony. */}
                {chosen && <Check aria-hidden="true" className="size-4" />}
                <span style={{ fontSize: scale.size }}>Aa</span>
                {scale.label}
              </button>
            );
          })}
        </div>

        <p className="rounded-field bg-slate-50 p-3 text-slate-700">
          Tak będzie wyglądać tekst w całej aplikacji.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Konto</h2>
        <p className="text-sm text-slate-600">
          Wylogowanie kończy sesję w tej przeglądarce. Twoje dane zostają na
          koncie.
        </p>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-field border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:border-danger-600 hover:bg-danger-50 hover:text-danger-700"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Wyloguj
        </button>
      </section>
    </section>
  );
}
