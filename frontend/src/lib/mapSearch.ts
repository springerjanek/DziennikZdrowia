// Oficjalny format odnosnika Map Google: otwiera wyszukiwanie, nic nie wysyla
// z naszej strony poza tym, co uzytkownik sam kliknal.
const SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=";

export function mapSearchUrl(name: string, place: string | null): string {
  const query = place === null ? name : `${name} ${place}`;
  return SEARCH_URL + encodeURIComponent(query);
}
