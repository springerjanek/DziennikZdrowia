import type { ChronicConditionId } from "./conditions";
import {
  ageByYear,
  ageInYearsCompleted,
  type HealthProfile,
  type Sex,
} from "./profile";

// PROGRAM_NFZ = bezpłatny, twarde kryteria. RECOMMENDATION = dobra praktyka, zwykle płatna.
export type RuleSource = "PROGRAM_NFZ" | "RECOMMENDATION";

export type AgeBasis = "year" | "completed";

export type AgeBand = {
  ageFrom: number;
  intervalMonths: number;
};

export type RuleEligibility = {
  sex?: Sex;
  ageFrom?: number;
  ageTo?: number;
  anyCondition?: ChronicConditionId[];
};

export type ScreeningRule = {
  id: string;
  label: string;
  rationale: string;
  source: RuleSource;
  ageBasis: AgeBasis;
  eligibility: RuleEligibility;
  intervals: AgeBand[];
  nfzBenefit?: string;
};

export type Recommendation =
  | {
      kind: "nfz";
      ruleId: string;
      label: string;
      rationale: string;
      intervalMonths: number;
      benefit?: string;
    }
  | {
      kind: "advice";
      ruleId: string;
      label: string;
      rationale: string;
      intervalMonths: number;
    };

export const SCREENING_RULES: ScreeningRule[] = [
  {
    id: "moje_zdrowie",
    label: "Bilans zdrowia (program Moje Zdrowie)",
    rationale:
      "Pakiet badań podstawowych finansowany przez NFZ od 20. roku życia.",
    source: "PROGRAM_NFZ",
    ageBasis: "year",
    eligibility: { ageFrom: 20 },
    intervals: [
      { ageFrom: 20, intervalMonths: 60 },
      { ageFrom: 50, intervalMonths: 36 },
    ],
  },
  {
    id: "mammography",
    label: "Mammografia",
    rationale: "Przesiew w kierunku raka piersi. Bez skierowania.",
    source: "PROGRAM_NFZ",
    ageBasis: "year",
    eligibility: { sex: "female", ageFrom: 45, ageTo: 74 },
    intervals: [{ ageFrom: 45, intervalMonths: 24 }],
    nfzBenefit: "MAMMOGRAFIA",
  },
  {
    id: "cervical_hpv",
    label: "Test HPV HR / cytologia",
    rationale: "Przesiew w kierunku raka szyjki macicy.",
    source: "PROGRAM_NFZ",
    ageBasis: "year",
    eligibility: { sex: "female", ageFrom: 25, ageTo: 64 },
    intervals: [{ ageFrom: 25, intervalMonths: 60 }],
  },
  {
    id: "colonoscopy",
    label: "Kolonoskopia przesiewowa",
    rationale: "Przesiew w kierunku raka jelita grubego.",
    source: "PROGRAM_NFZ",
    ageBasis: "year",
    eligibility: { ageFrom: 50, ageTo: 65 },
    intervals: [{ ageFrom: 50, intervalMonths: 120 }],
  },
  {
    id: "psa",
    label: "PSA (prostata)",
    rationale:
      "Brak populacyjnego programu NFZ — badanie do rozważenia po rozmowie z lekarzem.",
    source: "RECOMMENDATION",
    ageBasis: "completed",
    eligibility: { sex: "male", ageFrom: 50 },
    intervals: [{ ageFrom: 50, intervalMonths: 24 }],
  },
  {
    id: "hba1c",
    label: "Hemoglobina glikowana (HbA1c)",
    rationale: "Kontrola wyrównania cukrzycy.",
    source: "RECOMMENDATION",
    ageBasis: "completed",
    eligibility: { anyCondition: ["diabetes_t1", "diabetes_t2"] },
    intervals: [{ ageFrom: 0, intervalMonths: 6 }],
  },
  {
    id: "tsh",
    label: "TSH",
    rationale: "Kontrola czynności tarczycy.",
    source: "RECOMMENDATION",
    ageBasis: "completed",
    eligibility: { anyCondition: ["hypothyroidism", "hyperthyroidism"] },
    intervals: [{ ageFrom: 0, intervalMonths: 12 }],
  },
  {
    id: "lipid_panel",
    label: "Lipidogram",
    rationale: "Kontrola zaburzeń lipidowych i ryzyka sercowo-naczyniowego.",
    source: "RECOMMENDATION",
    ageBasis: "completed",
    eligibility: { anyCondition: ["hyperlipidemia", "ihd", "hypertension"] },
    intervals: [{ ageFrom: 0, intervalMonths: 12 }],
  },
];

export function ageForRule(
  rule: ScreeningRule,
  profile: HealthProfile,
  today = new Date(),
): number {
  if (rule.ageBasis === "year") {
    return ageByYear(profile.birthDate, today);
  }
  return ageInYearsCompleted(profile.birthDate, today);
}

export function hasAnyCondition(
  profile: HealthProfile,
  conditions: ChronicConditionId[],
): boolean {
  for (const condition of conditions) {
    if (profile.conditions.includes(condition)) {
      return true;
    }
  }
  return false;
}

export function isEligible(
  rule: ScreeningRule,
  profile: HealthProfile,
  today = new Date(),
): boolean {
  const { sex, ageFrom, ageTo, anyCondition } = rule.eligibility;

  if (sex && profile.sex !== sex) {
    return false;
  }

  if (anyCondition && !hasAnyCondition(profile, anyCondition)) {
    return false;
  }

  const age = ageForRule(rule, profile, today);

  if (ageFrom !== undefined && age < ageFrom) {
    return false;
  }
  if (ageTo !== undefined && age > ageTo) {
    return false;
  }

  return true;
}

//intervals: [
//   { ageFrom: 20, intervalMonths: 60 },
//   { ageFrom: 50, intervalMonths: 36 },
// ],
export function intervalForAge(
  rule: ScreeningRule,
  age: number,
): number | null {
  let intervalMonths: number | null = null;
  let matchedAgeFrom = -1;

  for (const band of rule.intervals) {
    if (age >= band.ageFrom && band.ageFrom > matchedAgeFrom) {
      matchedAgeFrom = band.ageFrom;
      intervalMonths = band.intervalMonths;
    }
  }

  return intervalMonths;
}

export function evaluate(
  profile: HealthProfile,
  today = new Date(),
): Recommendation[] {
  const programs: Recommendation[] = [];
  const recommendations: Recommendation[] = [];

  for (const rule of SCREENING_RULES) {
    if (!isEligible(rule, profile, today)) {
      continue;
    }

    const age = ageForRule(rule, profile, today);
    const intervalMonths = intervalForAge(rule, age);

    if (intervalMonths === null) {
      continue;
    }

    if (rule.source === "PROGRAM_NFZ") {
      programs.push({
        kind: "nfz",
        ruleId: rule.id,
        label: rule.label,
        rationale: rule.rationale,
        intervalMonths,
        benefit: rule.nfzBenefit,
      });
    } else {
      recommendations.push({
        kind: "advice",
        ruleId: rule.id,
        label: rule.label,
        rationale: rule.rationale,
        intervalMonths,
      });
    }
  }

  return [...programs, ...recommendations];
}
