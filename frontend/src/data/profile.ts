import { z } from "zod";
import type { HealthProfile, Sex } from "@/domain";
import { apiJson } from "@/lib/api";

const profileSchema = z.object({
  birthYear: z.number().int().nullable(),
  birthMonth: z.number().int().nullable(),
  sex: z.enum(["FEMALE", "MALE"]).nullable(),
  conditions: z.array(z.string()),
});

export type SavedProfile = z.infer<typeof profileSchema>;

// Backend zapisuje plec duzymi literami (enum Javy), front trzyma male.
function toApiSex(sex: Sex): "FEMALE" | "MALE" {
  switch (sex) {
    case "female":
      return "FEMALE";
    case "male":
      return "MALE";
  }
}

export function fetchProfile(signal?: AbortSignal): Promise<SavedProfile> {
  return apiJson("/api/me/profile", profileSchema, { signal });
}

export function saveProfile(profile: HealthProfile): Promise<SavedProfile> {
  return apiJson("/api/me/profile", profileSchema, {
    method: "PUT",
    body: {
      birthYear: profile.birthDate.year,
      birthMonth: profile.birthDate.month,
      sex: toApiSex(profile.sex),
      conditions: profile.conditions,
    },
  });
}
