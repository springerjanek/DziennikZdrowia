// Wzory paskow EAN-13: kazda cyfra to 7 modulow, 1 = czarny pasek.
const LEFT_ODD = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
];
const LEFT_EVEN = [
  "0100111",
  "0110011",
  "0011011",
  "0100001",
  "0011101",
  "0111001",
  "0000101",
  "0010001",
  "0001001",
  "0010111",
];
const RIGHT = [
  "1110010",
  "1100110",
  "1101100",
  "1000010",
  "1011100",
  "1001110",
  "1010000",
  "1000100",
  "1001000",
  "1110100",
];
// Pierwsza cyfra nie ma wlasnych paskow - koduje ja to, ktore z szesciu
// lewych cyfr sa zapisane wzorem parzystym (E), a ktore nieparzystym (O).
const FIRST_DIGIT = [
  "OOOOOO",
  "OOEOEE",
  "OOEEOE",
  "OOEEEO",
  "OEOOEE",
  "OEEOOE",
  "OEEEOO",
  "OEOEOE",
  "OEOEEO",
  "OEEOEO",
];

// Wykaz trzyma 14-cyfrowy GTIN z zerem na poczatku, na pudelku jest 13 cyfr.
export function toEan13(gtin: string): string | null {
  const ean = gtin.length === 14 && gtin.startsWith("0") ? gtin.slice(1) : gtin;
  return /^\d{13}$/.test(ean) && hasValidCheckDigit(ean) ? ean : null;
}

function hasValidCheckDigit(ean: string): boolean {
  const digits = [...ean].map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
      0,
    );
  return (10 - (sum % 10)) % 10 === digits[12];
}

/**
 * 95 modulow kodu: 101 + szesc cyfr + 01010 + szesc cyfr + 101.
 * Zwraca null dla numeru z bledna cyfra kontrolna - lepiej nie pokazac kodu
 * wcale, niz narysowac taki, ktory skaner odczyta jako inny lek.
 */
export function eanModules(gtin: string): string | null {
  const ean = toEan13(gtin);
  if (ean === null) {
    return null;
  }
  const digits = [...ean].map(Number);
  const parity = FIRST_DIGIT[digits[0]];

  const left = digits
    .slice(1, 7)
    .map((digit, index) =>
      parity[index] === "O" ? LEFT_ODD[digit] : LEFT_EVEN[digit],
    )
    .join("");
  const right = digits
    .slice(7)
    .map((digit) => RIGHT[digit])
    .join("");

  return `101${left}01010${right}101`;
}
