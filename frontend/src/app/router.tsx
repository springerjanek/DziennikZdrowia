import { createBrowserRouter } from "react-router";

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const [{ OnboardingPage }, { onboardingLoader }] = await Promise.all([
        import("@/features/onboarding/OnboardingPage"),
        import("@/pages/onboardingLoader"),
      ]);
      return { Component: OnboardingPage, loader: onboardingLoader };
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
        path: "historia",
        lazy: async () => {
          const [{ HistoryPage }, { historyLoader }] = await Promise.all([
            import("@/pages/HistoryPage"),
            import("@/pages/historyLoader"),
          ]);
          return { Component: HistoryPage, loader: historyLoader };
        },
      },
      {
        path: "sor",
        lazy: async () => {
          const { SorPage } = await import("@/pages/SorPage");
          return { Component: SorPage };
        },
      },
      {
        path: "ustawienia",
        lazy: async () => {
          const { SettingsPage } = await import("@/pages/SettingsPage");
          return { Component: SettingsPage };
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
