import { z } from "zod";
import type { ScreeningRule } from "@/domain";
import { apiJson } from "@/lib/api";

// Backend trzyma te same reguly co kiedys front, tylko w swoich nazwach:
// "FEMALE" zamiast "female", "YEAR" zamiast "year", null zamiast braku pola.
const apiSexSchema = z.enum(["FEMALE", "MALE"]);

const apiRuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  rationale: z.string(),
  source: z.enum(["PROGRAM_NFZ", "RECOMMENDATION"]),
  ageBasis: z.enum(["YEAR", "COMPLETED"]),
  eligibility: z.object({
    sex: apiSexSchema.nullable(),
    ageFrom: z.number().nullable(),
    ageTo: z.number().nullable(),
    // Celowo zwykly string, a nie nasz enum chorob: gdy backend doda nowa
    // chorobe, onboarding ma dalej dzialac, a nie wywalic sie na parsowaniu.
    anyCondition: z.array(z.string()),
  }),
  intervals: z.array(
    z.object({ ageFrom: z.number(), intervalMonths: z.number() }),
  ),
  nfzBenefit: z.string().nullable(),
});

function toSex(sex: "FEMALE" | "MALE" | null): "female" | "male" | undefined {
  if (sex === null) {
    return undefined;
  }
  return sex === "FEMALE" ? "female" : "male";
}

const screeningRulesSchema = z.array(
  apiRuleSchema.transform(
    (rule): ScreeningRule => ({
      id: rule.id,
      label: rule.label,
      rationale: rule.rationale,
      source: rule.source,
      ageBasis: rule.ageBasis === "YEAR" ? "year" : "completed",
      eligibility: {
        sex: toSex(rule.eligibility.sex),
        ageFrom: rule.eligibility.ageFrom ?? undefined,
        ageTo: rule.eligibility.ageTo ?? undefined,
        anyCondition:
          rule.eligibility.anyCondition.length === 0
            ? undefined
            : rule.eligibility.anyCondition,
      },
      intervals: rule.intervals,
      nfzBenefit: rule.nfzBenefit ?? undefined,
    }),
  ),
);

export function fetchScreeningRules(
  signal?: AbortSignal,
): Promise<ScreeningRule[]> {
  return apiJson("/api/screening/rules", screeningRulesSchema, { signal });
}
