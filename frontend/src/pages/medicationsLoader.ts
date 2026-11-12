import { fetchProfile } from "@/data/profile";
import { fetchUserMedications } from "@/data/userMedications";
import {
  savedEntitlements,
  type EntitlementCode,
  type UserMedication,
} from "@/domain";
import { redirectOnUnauthorized } from "@/lib/redirectOnUnauthorized";

export type MedicationsData = {
  medications: UserMedication[];
  // Uprawnienia lekowe uzytkownika: 65+ albo ponizej 18 lat. Wykaz podaje, komu
  // lek przysluguje bezplatnie, wiec bez tego karta mowilaby o cudzych pieniadzach.
  entitlements: EntitlementCode[];
};

export function medicationsLoader(): Promise<MedicationsData> {
  return Promise.all([fetchUserMedications(), fetchProfile()])
    .then(([medications, profile]) => ({
      medications,
      entitlements: savedEntitlements(profile.birthYear, profile.birthMonth),
    }))
    .catch(redirectOnUnauthorized);
}
