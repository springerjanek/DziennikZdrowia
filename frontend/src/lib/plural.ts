export type PluralForms = {
  one: string;
  few: string;
  many: string;
};

// Polska liczba mnoga: 1 bierze "one", koncowki 2-4 biora "few"
// (poza nastolatkami 12-14), cala reszta "many".
export function pluralForm(count: number, forms: PluralForms): string {
  if (count === 1) {
    return forms.one;
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return forms.few;
  }
  return forms.many;
}

export function pluralBadania(count: number): string {
  return pluralForm(count, {
    one: "badanie",
    few: "badania",
    many: "badań",
  });
}

export function formatInterval(months: number): string {
  if (months === 6) {
    return "co pół roku";
  }
  if (months % 12 !== 0) {
    const label = pluralForm(months, {
      one: "miesiąc",
      few: "miesiące",
      many: "miesięcy",
    });
    return `co ${months} ${label}`;
  }

  const years = months / 12;
  if (years === 1) {
    return "co rok";
  }

  const lastDigit = years % 10;
  const lastTwoDigits = years % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return `co ${years} lata`;
  }
  return `co ${years} lat`;
}
