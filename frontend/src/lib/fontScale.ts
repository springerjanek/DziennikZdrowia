const KEY = "dz.fontScale.v1";

// Procent rozmiaru bazowego <html>. Cala aplikacja jest w rem, wiec razem z
// tekstem rosna tez odstepy i przyciski - a nie tylko same litery.
export const FONT_SCALES = [
  { id: "standardowy", label: "Standardowy", size: "100%" },
  { id: "wiekszy", label: "Większy", size: "112.5%" },
  { id: "najwiekszy", label: "Największy", size: "125%" },
] as const;

export type FontScale = (typeof FONT_SCALES)[number];
export type FontScaleId = FontScale["id"];

const DEFAULT_SCALE = FONT_SCALES[0];

function findScale(id: string): FontScale {
  return FONT_SCALES.find((scale) => scale.id === id) ?? DEFAULT_SCALE;
}

export function loadFontScale(): FontScaleId {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === null ? DEFAULT_SCALE.id : findScale(stored).id;
  } catch {
    return DEFAULT_SCALE.id;
  }
}

export function applyFontScale(id: FontScaleId): void {
  document.documentElement.style.setProperty(
    "--app-font-scale",
    findScale(id).size,
  );
}

export function saveFontScale(id: FontScaleId): void {
  applyFontScale(id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // tryb prywatny - ustawienie zadziala, tylko nie przezyje odswiezenia
  }
}
