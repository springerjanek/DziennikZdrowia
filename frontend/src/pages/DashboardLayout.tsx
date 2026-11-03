import { Outlet, useLoaderData } from "react-router";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/DashboardSidebar";
import type { dashboardLayoutLoader } from "./dashboardLayoutLoader";

// Menu przy samej krawedzi ekranu, tresc obok niego - kalendarz potrzebuje
// szerokosci, a wyliczanka linkow nie. Na telefonie menu wraca na gore.
export function DashboardLayout() {
  const { user } = useLoaderData<typeof dashboardLayoutLoader>();

  return (
    <div className="min-h-screen sm:flex">
      <aside className="border-b border-slate-200 bg-white px-4 py-3 sm:sticky sm:top-0 sm:h-screen sm:w-56 sm:shrink-0 sm:border-r sm:border-b-0 sm:px-3 sm:py-6">
        <p className="mb-4 hidden px-3 font-semibold text-brand-700 sm:block">
          Dziennik Zdrowia
        </p>
        <DashboardSidebar />
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
          <DashboardHeader user={user} />

          <main className="min-w-0">
            <Outlet />
          </main>

          <MedicalDisclaimer />
        </div>
      </div>
    </div>
  );
}
