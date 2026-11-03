import { fetchUserMedications } from "@/data/userMedications";
import type { UserMedication } from "@/domain";
import { redirectOnUnauthorized } from "@/lib/redirectOnUnauthorized";

export function medicationsLoader(): Promise<UserMedication[]> {
  return fetchUserMedications().catch(redirectOnUnauthorized);
}
