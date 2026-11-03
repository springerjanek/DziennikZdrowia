import { redirect } from "react-router";
import { ApiError } from "./api";

// Loadery rodzica i dziecka leca rownolegle, wiec kazdy musi sam poradzic sobie
// z wygasla sesja - inaczej dziecko rzucaloby 401 obok przekierowania rodzica.
export function redirectOnUnauthorized(error: unknown): never {
  if (error instanceof ApiError && error.status === 401) {
    throw redirect("/konto");
  }
  throw error;
}
