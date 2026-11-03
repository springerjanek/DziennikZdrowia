import type { DueScreening } from "@/domain";
import { ScreeningCard } from "./ScreeningCard";

type Props = {
  screenings: DueScreening[];
};

export function RecommendationList({ screenings }: Props) {
  if (screenings.length === 0) {
    return (
      <p className="text-slate-600">
        Na dziś nie mamy dla Ciebie żadnych badań z kalendarza profilaktyki.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {screenings.map((screening) => (
        <ScreeningCard key={screening.ruleId} screening={screening} />
      ))}
    </ul>
  );
}
