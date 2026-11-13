import type { UserScreening } from "@/data/screeningHistory";

export const ANY = "wszystkie";

export type Choice = {
  value: string;
  label: string;
};

export function filterHistory(
  history: UserScreening[],
  rule: string,
  year: string,
): UserScreening[] {
  return history.filter(
    (entry) =>
      (rule === ANY || entry.ruleId === rule) &&
      (year === ANY || entry.performedOn.startsWith(year)),
  );
}

// Do wyboru tylko to, co uzytkownik ma w historii - filtr, ktory nic nie znajduje,
// jest gorszy niz brak filtra.
export function ruleChoices(history: UserScreening[]): Choice[] {
  const byId = new Map<string, string>();
  for (const entry of history) {
    byId.set(entry.ruleId, entry.ruleLabel);
  }
  return [...byId]
    .map(([value, label]) => ({ value, label }))
    .sort((first, second) => first.label.localeCompare(second.label, "pl"));
}

export function yearChoices(history: UserScreening[]): Choice[] {
  const years = new Set(history.map((entry) => entry.performedOn.slice(0, 4)));
  return [...years]
    .sort((first, second) => second.localeCompare(first))
    .map((year) => ({ value: year, label: year }));
}
