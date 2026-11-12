import { fetchScreeningRules } from "@/data/screeningRules";
import type { ScreeningRule } from "@/domain";

// Onboarding dziala przed zalogowaniem, a katalog regul jest publiczny.
// Gdy backend nie odpowie, kreator ma dzialac dalej - tylko bez licznika badan.
export async function onboardingLoader({
  request,
}: {
  request: Request;
}): Promise<ScreeningRule[]> {
  try {
    return await fetchScreeningRules(request.signal);
  } catch {
    return [];
  }
}
