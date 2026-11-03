import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const { OnboardingPage } = await import(
        "@/features/onboarding/OnboardingPage"
      );
      return { Component: OnboardingPage };
    },
  },
  {
    path: "/konto",
    lazy: async () => {
      const { SignInPage } = await import("@/pages/SignInPage");
      return { Component: SignInPage };
    },
  },
  {
    path: "/dashboard",
    lazy: async () => {
      const [{ DashboardLayout }, { dashboardLayoutLoader }] =
        await Promise.all([
          import("@/pages/DashboardLayout"),
          import("@/pages/dashboardLayoutLoader"),
        ]);
      return { Component: DashboardLayout, loader: dashboardLayoutLoader };
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const [{ DashboardHomePage }, { dashboardHomeLoader }] =
            await Promise.all([
              import("@/pages/DashboardHomePage"),
              import("@/pages/dashboardHomeLoader"),
            ]);
          return {
            Component: DashboardHomePage,
            loader: dashboardHomeLoader,
          };
        },
      },
      {
        path: "leki",
        lazy: async () => {
          const [{ MedicationsPage }, { medicationsLoader }] =
            await Promise.all([
              import("@/pages/MedicationsPage"),
              import("@/pages/medicationsLoader"),
            ]);
          return { Component: MedicationsPage, loader: medicationsLoader };
        },
      },
    ],
  },
]);
