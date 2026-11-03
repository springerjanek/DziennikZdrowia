import { Link, useLoaderData } from "react-router";
import { PlanView } from "@/features/plan/PlanView";
import type { dashboardHomeLoader } from "./dashboardHomeLoader";

export function DashboardHomePage() {
  const { screenings, medications, history } = useLoaderData<typeof dashboardHomeLoader>();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Twój kalendarz</h1>

      {screenings.kind === "profileIncomplete" ? (
        <p className="text-slate-600">
          Nie mamy jeszcze Twojego profilu.{" "}
          <Link to="/" className="text-brand-600 underline underline-offset-4">
            Uzupełnij dane
          </Link>
          .
        </p>
      ) : (
        <PlanView
          screenings={screenings.screenings}
          medications={medications}
          history={history}
        />
      )}
    </section>
  );
}
