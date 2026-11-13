import { z } from "zod";
import { longDateLabel } from "./plan";

export const ruleSourceSchema = z.enum(["PROGRAM_NFZ", "RECOMMENDATION"]);

export type RuleSource = z.infer<typeof ruleSourceSchema>;

export const screeningStatusSchema = z.enum([
  "NEVER_DONE",
  "DUE",
  "UPCOMING",
]);

export type ScreeningStatus = z.infer<typeof screeningStatusSchema>;

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const dueScreeningSchema = z.object({
  ruleId: z.string().min(1),
  label: z.string().min(1),
  rationale: z.string(),
  source: ruleSourceSchema,
  nfzBenefit: z.string().nullable(),
  intervalMonths: z.number().int().positive(),
  lastPerformedOn: isoDateSchema.nullable(),
  nextDueOn: isoDateSchema.nullable(),
  status: screeningStatusSchema,
});

export type DueScreening = z.infer<typeof dueScreeningSchema>;

export function formatScreeningDate(isoDate: string): string {
  return longDateLabel(isoDate);
}

export function describeDue(screening: DueScreening): string {
  switch (screening.status) {
    case "NEVER_DONE":
      return "Nie masz tego badania w historii";
    case "DUE":
      return screening.nextDueOn === null
        ? "Termin minął"
        : `Termin minął ${formatScreeningDate(screening.nextDueOn)}`;
    case "UPCOMING":
      return screening.nextDueOn === null
        ? "Aktualne"
        : `Następne ${formatScreeningDate(screening.nextDueOn)}`;
  }
}
