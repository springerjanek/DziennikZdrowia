// KtoMaLek i GdziePoLek nie maja publicznego adresu wyszukiwania, ktory dalo by
// sie wywolac linkiem - widzet KtoMaLek wymaga klucza i zgody serwisu. Do czasu
// takiej integracji odsylamy do wyszukiwarki; zmiana to jedna linijka tutaj.
const SEARCH_URL = "https://www.google.com/search?q=";

export function pharmacySearchUrl(name: string): string {
  return SEARCH_URL + encodeURIComponent(`${name} apteka dostępność`);
}
