import { z } from "zod";

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

// Z czesci daty, nie przez new Date(iso) - to parsuje sie jako UTC i potrafi cofnac dzien.
export function formatScreeningDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
