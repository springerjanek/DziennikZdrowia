import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";
import type { AuthUser } from "./types";

// Sesja zyje na backendzie (ciasteczko HttpOnly) - front nie trzyma tokenu
// ani danych usera w localStorage.

const authUserSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().min(3).max(320),
    name: z.string().max(200).nullable(),
    pictureUrl: z.string().max(2048).nullable(),
  })
  .transform(
    (user): AuthUser => ({ ...user, name: user.name ?? user.email }),
  );

async function parseUser(response: Response): Promise<AuthUser> {
  return authUserSchema.parse(await response.json());
}

// Backend weryfikuje ID token od Google i zaklada sesje.
export async function signInWithGoogle(credential: string): Promise<AuthUser> {
  const response = await apiFetch("/api/auth/google", {
    method: "POST",
    body: { credential },
  });
  return parseUser(response);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await parseUser(await apiFetch("/api/me"));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
}
