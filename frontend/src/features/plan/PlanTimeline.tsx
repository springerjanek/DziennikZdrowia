import { Check, Pill, Stethoscope, type LucideIcon } from "lucide-react";
import { Fragment } from "react";
import {
  formatDoseTime,
  nowMarkerIndex,
  type PlanEvent,
} from "@/domain";

type Props = {
  events: PlanEvent[];
  // "HH:mm:ss", gdy pokazywany dzien to dzisiaj - inaczej null i nie ma linii.
  now: string | null;
  onPick: (event: PlanEvent) => void;
};

const ICONS: Record<PlanEvent["kind"], LucideIcon> = {
  dose: Pill,
  asNeeded: Pill,
  screening: Stethoscope,
  done: Check,
};

const ICON_COLORS: Record<PlanEvent["kind"], string> = {
  dose: "text-brand-600",
  asNeeded: "text-slate-500",
  screening: "text-success-700",
  done: "text-slate-400",
};

function NowLine({ now }: { now: string }) {
  return (
    <li className="flex items-center gap-2 py-1">
      <span className="sr-only">Teraz, {formatDoseTime(now)}</span>
      <span
        aria-hidden="true"
        className="w-12 shrink-0 text-right text-xs font-bold text-danger-600 tabular-nums"
      >
        {formatDoseTime(now)}
      </span>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-danger-600" />
      <span aria-hidden="true" className="h-px flex-1 bg-danger-600" />
    </li>
  );
}

// Lista zdarzen dnia w kolejnosci godzin. Siatki godzinowej nie rysujemy: dawka
// leku to punkt, a nie przedzial, wiec 17 z 24 godzin byloby puste.
export function PlanTimeline({ events, now, onPick }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-600">Nic tu nie masz zaplanowanego.</p>
    );
  }

  const marker = now === null ? -1 : nowMarkerIndex(events, now);

  return (
    <ul className="flex flex-col">
      {events.map((event, index) => {
        const Icon = ICONS[event.kind];
        return (
          <Fragment key={event.key}>
            {now !== null && index === marker && <NowLine now={now} />}
            <li>
              <button
                type="button"
                onClick={() => onPick(event)}
                className="flex min-h-11 w-full items-start gap-3 rounded-field px-2 py-2 text-left hover:bg-slate-100"
              >
                <span className="w-12 shrink-0 pt-0.5 text-sm font-medium text-slate-700 tabular-nums">
                  {event.time === null ? "" : formatDoseTime(event.time)}
                </span>
                <Icon
                  aria-hidden="true"
                  className={`mt-0.5 size-5 shrink-0 ${ICON_COLORS[event.kind]}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{event.title}</span>
                  {event.detail !== null && (
                    <span className="block text-sm text-slate-600">
                      {event.detail}
                    </span>
                  )}
                </span>
              </button>
            </li>
          </Fragment>
        );
      })}

      {now !== null && marker === events.length && <NowLine now={now} />}
    </ul>
  );
}
