import { fetchProfile, type SavedProfile } from "@/data/profile";
import {
  fetchScreeningHistory,
  type UserScreening,
} from "@/data/screeningHistory";
import { fetchUserMedications } from "@/data/userMedications";
import type { UserMedication } from "@/domain";
import { redirectOnUnauthorized } from "@/lib/redirectOnUnauthorized";

export type DoctorCardData = {
  medications: UserMedication[];
  history: UserScreening[];
  profile: SavedProfile;
};

export function doctorCardLoader({
  request,
}: {
  request: Request;
}): Promise<DoctorCardData> {
  return Promise.all([
    fetchUserMedications(request.signal),
    fetchScreeningHistory(request.signal),
    fetchProfile(request.signal),
  ])
    .then(([medications, history, profile]) => ({
      medications,
      history,
      profile,
    }))
    .catch(redirectOnUnauthorized);
}
