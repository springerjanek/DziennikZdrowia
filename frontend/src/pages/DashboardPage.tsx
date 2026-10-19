import { Link, useLoaderData, useNavigate } from "react-router";
import { signOut } from "@/auth/session";
import { evaluate } from "@/domain";
import { draftToProfile } from "@/features/onboarding/draft";
import { loadDraft } from "@/lib/draftStorage";
import { formatInterval } from "@/lib/plural";
import type { dashboardLoader } from "./dashboardLoader";

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useLoaderData<typeof dashboardLoader>();

  const profile = draftToProfile(loadDraft());
  const recommendations = profile === null ? [] : evaluate(profile);

  function handleSignOut() {
    // Nawet gdy backend nie odpowie, wracamy do logowania.
    void signOut()
      .catch(() => undefined)
      .then(() => navigate("/konto", { replace: true }));
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex items-center gap-3">
        {user.pictureUrl !== null && (
          <img
            src={user.pictureUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-field border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
        >
          Wyloguj
        </button>
      </header>

      <section className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Twój plan na najbliższy rok</h1>

        {recommendations.length === 0 ? (
          <p className="text-slate-600">
            Nie mamy jeszcze Twojego profilu.{" "}
            <Link to="/" className="text-brand-600 underline underline-offset-4">
              Uzupełnij dane
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recommendations.map((recommendation) => (
              <li
                key={recommendation.ruleId}
                className="flex flex-col gap-2 rounded-card border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <h2 className="flex-1 font-semibold">
                    {recommendation.label}
                  </h2>
                  {recommendation.kind === "nfz" ? (
                    <span className="shrink-0 rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success-700">
                      bezpłatne na NFZ
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      zalecenie
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600">
                  {recommendation.rationale}
                </p>
                <p className="text-sm font-medium text-brand-700">
                  {formatInterval(recommendation.intervalMonths)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
