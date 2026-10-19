export function pluralBadania(count: number): string {
  if (count === 1) {
    return "badanie";
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;

  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return "badania";
  }
  return "badań";
}

export function formatInterval(months: number): string {
  if (months === 6) {
    return "co pół roku";
  }
  if (months % 12 !== 0) {
    return `co ${months} mies.`;
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
