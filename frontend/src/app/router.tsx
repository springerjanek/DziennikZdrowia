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
      const [{ DashboardPage }, { dashboardLoader }] = await Promise.all([
        import("@/pages/DashboardPage"),
        import("@/pages/dashboardLoader"),
      ]);
      return { Component: DashboardPage, loader: dashboardLoader };
    },
  },
]);
