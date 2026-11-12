// PROGRAM_NFZ = bezpłatny, twarde kryteria. RECOMMENDATION = dobra praktyka, zwykle płatna.
import type { RuleSource } from "./dueScreenings";
import {
  ageByYear,
  ageInYearsCompleted,
  type HealthProfile,
  type Sex,
} from "./profile";

export type AgeBasis = "year" | "completed";

export type AgeBand = {
  ageFrom: number;
  intervalMonths: number;
};

export type RuleEligibility = {
  sex?: Sex;
  ageFrom?: number;
  ageTo?: number;
  // Zwykle stringi, bo lista chorob zyje w backendzie - nieznane id po prostu
  // nie pasuje do profilu zamiast wywalac parsowanie.
  anyCondition?: string[];
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
  conditions: string[],
): boolean {
  for (const condition of profile.conditions) {
    if (conditions.includes(condition)) {
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

// Reguly przychodza z backendu (GET /api/screening/rules) - front nie trzyma
// juz wlasnej kopii, zeby zmiana progu wieku nie wymagala poprawki w dwoch repo.
export function evaluate(
  profile: HealthProfile,
  rules: ScreeningRule[],
  today = new Date(),
): Recommendation[] {
  const programs: Recommendation[] = [];
  const recommendations: Recommendation[] = [];

  for (const rule of rules) {
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
