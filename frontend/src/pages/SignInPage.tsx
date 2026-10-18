import { useNavigate } from "react-router";
import { GoogleSignInButton } from "@/auth/GoogleSignInButton";
import { saveSession } from "@/auth/session";
import type { AuthUser } from "@/auth/types";

export function SignInPage() {
  const navigate = useNavigate();

  function handleSignedIn(user: AuthUser) {
    saveSession(user);
    void navigate("/dashboard", { replace: true });
  }

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

      <GoogleSignInButton onSignedIn={handleSignedIn} />

      <p className="text-center text-xs text-slate-500">
        Nie przechowujemy Twojego hasła. Logowanie obsługuje Google.
      </p>
    </main>
  );
}
