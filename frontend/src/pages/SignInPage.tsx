import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { GoogleSignInButton } from "@/auth/GoogleSignInButton";
import { signInAsTester, signInWithGoogle } from "@/auth/session";
import type { AuthUser } from "@/auth/types";
import { saveProfile } from "@/data/profile";
import { draftToProfile } from "@/features/onboarding/draft";
import { loadDraft } from "@/lib/draftStorage";

// Vite podmienia ta zmienna na literal przy buildzie, wiec bez VITE_DEV_LOGIN=true
// caly przycisk wypada z bundla.
const devLoginEnabled = import.meta.env.VITE_DEV_LOGIN === "true";

// Logowanie to pierwszy moment, w ktorym mamy gdzie zapisac profil z onboardingu.
// Nieudany zapis nie blokuje wejscia - dashboard sam poprosi wtedy o uzupelnienie.
async function sendDraftProfile(): Promise<void> {
  const profile = draftToProfile(loadDraft());
  if (profile === null) {
    return;
  }
  await saveProfile(profile).catch(() => undefined);
}

export function SignInPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(
    (request: Promise<AuthUser>) => {
      setPending(true);
      setError(null);
      request
        .then(() => sendDraftProfile())
        .then(() => navigate("/dashboard", { replace: true }))
        .catch(() => {
          setError("Nie udało się zalogować. Spróbuj ponownie.");
          setPending(false);
        });
    },
    [navigate],
  );

  // useCallback: GoogleSignInButton inicjalizuje GIS od nowa przy zmianie tej funkcji.
  const handleCredential = useCallback(
    (credential: string) => {
      handleSignIn(signInWithGoogle(credential));
    },
    [handleSignIn],
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-2xl font-bold text-balance">
          Zapisz swój plan zdrowia
        </h1>
        <p className="text-slate-600">
          Załóż konto, żeby wrócić do swoich badań z dowolnego urządzenia i
          dostawać przypomnienia.
        </p>
      </div>

      <GoogleSignInButton onCredential={handleCredential} />

      {devLoginEnabled && (
        <button
          type="button"
          onClick={() => handleSignIn(signInAsTester())}
          disabled={pending}
          className="mx-auto inline-flex min-h-11 items-center rounded-field border border-dashed border-slate-400 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          Zaloguj jako tester (tylko lokalnie)
        </button>
      )}

      {pending && (
        <p role="status" className="text-center text-sm text-slate-600">
          Logowanie…
        </p>
      )}
      {error !== null && (
        <p role="alert" className="text-center text-sm text-danger-700">
          {error}
        </p>
      )}

      <p className="text-center text-xs text-slate-500">
        Nie przechowujemy Twojego hasła. Logowanie obsługuje Google.
      </p>
    </main>
  );
}
