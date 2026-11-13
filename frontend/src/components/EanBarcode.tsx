import { eanModules, toEan13 } from "@/domain";

type Props = {
  gtin: string;
};

// Margines po bokach jest czescia kodu: bez "cichej strefy" skaner nie wie,
// gdzie kod sie zaczyna.
const QUIET_ZONE = 11;
const HEIGHT = 60;

export function EanBarcode({ gtin }: Props) {
  const modules = eanModules(gtin);
  const ean = toEan13(gtin);
  if (modules === null || ean === null) {
    return null;
  }
  const width = modules.length + 2 * QUIET_ZONE;

  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Kod kreskowy ${ean}`}
        className="w-full max-w-xs bg-white"
        // Bez tego przegladarka wygladza krawedzie paskow i skaner gubi sie na szarym.
        shapeRendering="crispEdges"
      >
        <rect width={width} height={HEIGHT} fill="#ffffff" />
        {[...modules].map((module, index) =>
          module === "1" ? (
            <rect
              key={index}
              x={QUIET_ZONE + index}
              y={0}
              width={1}
              height={HEIGHT}
              fill="#000000"
            />
          ) : null,
        )}
      </svg>
      <figcaption className="font-mono text-sm tracking-widest text-slate-700">
        {ean}
      </figcaption>
    </figure>
  );
}
