import { groupScreeningsByMonth, type DueScreening } from "@/domain";
import { RecommendationList } from "./RecommendationList";

type Props = {
  screenings: DueScreening[];
};

export function PlanAgenda({ screenings }: Props) {
  const groups = groupScreeningsByMonth(screenings);

  if (groups.length === 0) {
    return (
      <p className="text-slate-600">
        Na dziś nie mamy dla Ciebie żadnych badań z kalendarza profilaktyki.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            {group.label}
          </h3>
          <RecommendationList screenings={group.screenings} />
        </section>
      ))}
    </div>
  );
}
