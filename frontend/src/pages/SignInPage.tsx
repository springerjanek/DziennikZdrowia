import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { GoogleSignInButton } from "@/auth/GoogleSignInButton";
import { signInWithGoogle } from "@/auth/session";

export function SignInPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useCallback: GoogleSignInButton inicjalizuje GIS od nowa przy zmianie tej funkcji.
  const handleCredential = useCallback(
    (credential: string) => {
      setPending(true);
      setError(null);
      signInWithGoogle(credential)
        .then(() => navigate("/dashboard", { replace: true }))
        .catch(() => {
          setError("Nie udało się zalogować. Spróbuj ponownie.");
          setPending(false);
        });
    },
    [navigate],
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
