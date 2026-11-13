import { z } from "zod";
import { apiFetch, apiJson } from "@/lib/api";

const userScreeningSchema = z.object({
  id: z.string().min(1),
  ruleId: z.string().min(1),
  ruleLabel: z.string(),
  performedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().nullable(),
});

export type UserScreening = z.infer<typeof userScreeningSchema>;

export function fetchScreeningHistory(
  signal?: AbortSignal,
): Promise<UserScreening[]> {
  return apiJson("/api/me/screenings/history", userScreeningSchema.array(), {
    signal,
  });
}

// Backend odrzuca date z przyszlosci - liczy ja wg strefy Europe/Warsaw, nie wg serwera.
export function recordScreening(
  ruleId: string,
  performedOn: string,
  notes: string | null = null,
): Promise<UserScreening> {
  return apiJson("/api/me/screenings", userScreeningSchema, {
    method: "POST",
    body: { ruleId, performedOn, notes },
  });
}

export async function deleteScreening(id: string): Promise<void> {
  await apiFetch(`/api/me/screenings/${id}`, { method: "DELETE" });
}
