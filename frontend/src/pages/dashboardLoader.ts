import { redirect } from "react-router";
import { fetchCurrentUser } from "@/auth/session";
import type { AuthUser } from "@/auth/types";

export async function dashboardLoader(): Promise<AuthUser> {
  const user = await fetchCurrentUser();
  if (user === null) {
    throw redirect("/konto");
  }
  return user;
}
