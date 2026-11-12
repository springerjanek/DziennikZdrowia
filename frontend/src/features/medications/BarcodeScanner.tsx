import { useEffect, useRef, useState } from "react";
import { createEanDetector } from "@/lib/barcodeDetector";

type Props = {
  onDetected: (code: string) => void;
};

const SCAN_EVERY_MS = 300;

export function BarcodeScanner({ onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detector = createEanDetector();
    const video = videoRef.current;
    if (detector === null || video === null) {
      return;
    }

    // Efekt moze zostac posprzatany, zanim kamera odpowie (StrictMode montuje
    // komponent dwa razy) - wtedy strumien trzeba zamknac od razu po otwarciu,
    // inaczej dioda kamery swieci sie dalej.
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((opened) => {
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        video.srcObject = opened;
        void video.play();

        timer = window.setInterval(() => {
          detector
            .detect(video)
            .then((found) => {
              if (!cancelled && found.length > 0) {
                onDetected(found[0].rawValue);
              }
            })
            // Pojedyncza nieudana klatka to nie blad - nastepna proba za chwile.
            .catch(() => undefined);
        }, SCAN_EVERY_MS);
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            "Nie mamy dostępu do aparatu. Możesz wpisać numer spod kodu kreskowego ręcznie.",
          );
        }
      });

    return () => {
      cancelled = true;
      if (timer !== null) {
        window.clearInterval(timer);
      }
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected]);

  return (
    <div className="flex flex-col gap-3">
      {error === null ? (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            className="aspect-video w-full rounded-field bg-slate-900 object-cover"
          />
          <p role="status" className="text-sm text-slate-600">
            Skieruj aparat na kod kreskowy na pudełku. Lek znajdzie się sam.
          </p>
        </>
      ) : (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
