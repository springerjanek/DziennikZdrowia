import { useEffect, useRef, useState } from "react";
import { readGoogleIdToken } from "./googleIdToken";
import type { AuthUser } from "./types";

type CredentialResponse = {
  credential?: string;
};

type GoogleIdApi = {
  initialize(config: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
    login_uri?: string;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      locale?: string;
      width?: number;
    },
  ): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts.id) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing !== null) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gis")));
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gis"));
    document.head.appendChild(script);
  });
}

type GoogleSignInButtonProps = {
  onSignedIn: (user: AuthUser) => void;
};

export function GoogleSignInButton({ onSignedIn }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const error = clientId ? loadError : "Brak VITE_GOOGLE_CLIENT_ID w .env";

  useEffect(() => {
    if (!clientId) {
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        const api = window.google?.accounts.id;
        if (cancelled || !api || containerRef.current === null) {
          return;
        }

        api.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: (response) => {
            if (!response.credential) {
              setLoadError("Logowanie nie zwróciło tokenu.");
              return;
            }
            const user = readGoogleIdToken(response.credential);
            if (user === null) {
              setLoadError("Nie udało się odczytać danych konta.");
              return;
            }
            onSignedIn(user);
          },
        });

        api.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          locale: "pl",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Nie udało się załadować logowania Google.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, onSignedIn]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} />
      {error !== null && (
        <p role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
