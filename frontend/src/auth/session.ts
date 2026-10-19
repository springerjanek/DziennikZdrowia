import { z } from "zod";
import type { AuthUser } from "./types";

const SESSION_KEY = "dz.session.v1";

const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(3).max(320),
  name: z.string().min(1).max(200),
  pictureUrl: z.string().max(2048).nullable(),
});

export function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw === null) {
      return null;
    }

    const result = authUserSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // tryb prywatny - sesja przetrwa tylko do przeladowania
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // jw.
  }
}
