// "240" to dla pacjenta nic nie znaczy - potrzebuje "okolo 4 godzin".
export function formatWait(minutes: number): string {
  if (minutes < 60) {
    return minutes === 1 ? "około minuty" : `około ${minutes} minut`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  // Po "okolo" idzie dopelniacz: okolo godziny, okolo dwoch godzin - nigdy "okolo 2 godziny".
  const hoursLabel = hours === 1 ? "godziny" : "godzin";
  if (rest === 0) {
    return `około ${hours} ${hoursLabel}`;
  }
  return `około ${hours} ${hoursLabel} ${rest} minut`;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km`;
}

// Godzina pobrania danych - backend odpytuje kolejkisor.pl cyklicznie, wiec
// to nie jest "teraz" i nie udajemy, ze jest.
export function formatFetchedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
