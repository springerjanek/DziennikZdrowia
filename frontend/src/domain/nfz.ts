// "83 dni" nic nie mowi o tym, czy to duzo - miesiace mowia. Po "okolo" idzie
// dopelniacz, wiec miesiaca/miesiecy, nigdy "okolo 3 miesiace".
export function formatWaitDays(days: number): string {
  if (days < 60) {
    return `około ${days} dni`;
  }
  const months = Math.round(days / 30);
  const label = months === 1 ? "miesiąca" : "miesięcy";
  return `około ${months} ${label} (${days} dni)`;
}
