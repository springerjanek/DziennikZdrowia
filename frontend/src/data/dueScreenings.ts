import { z } from "zod";
import { dueScreeningSchema, type DueScreening } from "@/domain";
import { ApiError, apiJson } from "@/lib/api";

const dueScreeningsSchema = z.array(dueScreeningSchema);

// Backend oddaje 409, gdy nie zna roku urodzenia i plci - bez tego nie wyliczy zadnej reguly.
export type DueScreeningsResult =
  | { kind: "ok"; screenings: DueScreening[] }
  | { kind: "profileIncomplete" };

export async function fetchDueScreenings(
  signal?: AbortSignal,
): Promise<DueScreeningsResult> {
  try {
    const screenings = await apiJson(
      "/api/me/screenings",
      dueScreeningsSchema,
      { signal },
    );
    return { kind: "ok", screenings };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return { kind: "profileIncomplete" };
    }
    throw error;
  }
}
