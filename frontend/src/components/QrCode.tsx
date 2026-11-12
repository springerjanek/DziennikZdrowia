import QRCode from "qrcode";

type Props = {
  text: string;
  label: string;
};

// Margines wokol kodu jest wymagany przez standard, tak jak przy kodzie kreskowym.
const MARGIN = 4;

// Biblioteka liczy sama macierz, a rysujemy ja sami jako SVG - bez
// dangerouslySetInnerHTML i bez czekania na asynchroniczny obrazek.
function darkModulesPath(text: string): { path: string; size: number } | null {
  try {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: "M" });
    let path = "";
    for (let row = 0; row < modules.size; row += 1) {
      for (let column = 0; column < modules.size; column += 1) {
        if (modules.get(row, column) === 1) {
          path += `M${column + MARGIN} ${row + MARGIN}h1v1h-1z`;
        }
      }
    }
    return { path, size: modules.size + 2 * MARGIN };
  } catch {
    // Za dlugi tekst nie miesci sie w zadnej wersji kodu.
    return null;
  }
}

export function QrCode({ text, label }: Props) {
  const code = darkModulesPath(text);
  if (code === null) {
    return null;
  }

  return (
    <svg
      viewBox={`0 0 ${code.size} ${code.size}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className="size-40 bg-white"
    >
      <rect width={code.size} height={code.size} fill="#ffffff" />
      <path d={code.path} fill="#000000" />
    </svg>
  );
}
