import { Outlet, useLoaderData } from "react-router";
import { MedicalDisclaimer } from "@/components/MedicalDisclaimer";
import { DashboardHeader } from "@/features/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/features/dashboard/DashboardSidebar";
import type { dashboardLayoutLoader } from "./dashboardLayoutLoader";

export function DashboardLayout() {
  const { user } = useLoaderData<typeof dashboardLayoutLoader>();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <DashboardHeader user={user} />

      <div className="flex flex-col gap-8 sm:flex-row">
        <aside className="sm:w-44 sm:shrink-0">
          <DashboardSidebar />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}
