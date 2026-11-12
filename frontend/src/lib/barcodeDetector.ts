// BarcodeDetector jest w Chrome i na Androidzie, ale TypeScript nie ma jeszcze
// jego typow, a Safari i Firefox nie maja go wcale. Stad wlasny, waski opis
// i sprawdzenie przed uzyciem zamiast zalozenia, ze jest.
type DetectedBarcode = {
  rawValue: string;
};

export type Detector = {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
};

type DetectorConstructor = new (options: { formats: string[] }) => Detector;

function detectorConstructor(): DetectorConstructor | null {
  const holder = window as unknown as { BarcodeDetector?: DetectorConstructor };
  return holder.BarcodeDetector ?? null;
}

// Kamera dziala tylko na https i na localhost, wiec sprawdzamy tez mediaDevices.
export function canScanBarcodes(): boolean {
  return detectorConstructor() !== null && navigator.mediaDevices !== undefined;
}

export function createEanDetector(): Detector | null {
  const Constructor = detectorConstructor();
  return Constructor === null ? null : new Constructor({ formats: ["ean_13"] });
}
