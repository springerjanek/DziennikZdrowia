import { z } from "zod";
import {
  userMedicationSchema,
  type UserMedication,
  type UserMedicationRequest,
} from "@/domain";
import { apiFetch, apiJson } from "@/lib/api";

const userMedicationsSchema = z.array(userMedicationSchema);

export function fetchUserMedications(
  signal?: AbortSignal,
): Promise<UserMedication[]> {
  return apiJson("/api/me/medications", userMedicationsSchema, { signal });
}

export function createUserMedication(
  request: UserMedicationRequest,
): Promise<UserMedication> {
  return apiJson("/api/me/medications", userMedicationSchema, {
    method: "POST",
    body: request,
  });
}

export function updateUserMedication(
  id: string,
  request: UserMedicationRequest,
): Promise<UserMedication> {
  return apiJson(`/api/me/medications/${id}`, userMedicationSchema, {
    method: "PUT",
    body: request,
  });
}

export async function deleteUserMedication(id: string): Promise<void> {
  await apiFetch(`/api/me/medications/${id}`, { method: "DELETE" });
}
