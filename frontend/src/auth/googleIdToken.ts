import type { AuthUser } from "./types";

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function readGoogleIdToken(idToken: string): AuthUser | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload: unknown = JSON.parse(decodeBase64Url(parts[1]));
    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const claims = payload as Record<string, unknown>;
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
      return null;
    }

    return {
      id: claims.sub,
      email: claims.email,
      name: typeof claims.name === "string" ? claims.name : claims.email,
      pictureUrl:
        typeof claims.picture === "string" ? claims.picture : null,
    };
  } catch {
    return null;
  }
}
