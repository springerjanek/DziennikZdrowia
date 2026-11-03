import {
  fetchDueScreenings,
  type DueScreeningsResult,
} from "@/data/dueScreenings";
import {
  fetchScreeningHistory,
  type UserScreening,
} from "@/data/screeningHistory";
import { fetchUserMedications } from "@/data/userMedications";
import type { UserMedication } from "@/domain";
import { redirectOnUnauthorized } from "@/lib/redirectOnUnauthorized";

export type DashboardHome = {
  screenings: DueScreeningsResult;
  medications: UserMedication[];
  history: UserScreening[];
};

// Kalendarz pokazuje badania przed nami, dni brania lekow i badania juz wykonane.
export async function dashboardHomeLoader(): Promise<DashboardHome> {
  const [screenings, medications, history] = await Promise.all([
    fetchDueScreenings(),
    fetchUserMedications(),
    fetchScreeningHistory(),
  ]).catch(redirectOnUnauthorized);

  return { screenings, medications, history };
}
