import {
  fetchScreeningHistory,
  type UserScreening,
} from "@/data/screeningHistory";
import { fetchScreeningRules } from "@/data/screeningRules";
import type { ScreeningRule } from "@/domain";
import { redirectOnUnauthorized } from "@/lib/redirectOnUnauthorized";

export type HistoryData = {
  history: UserScreening[];
  rules: ScreeningRule[];
};

// Reguly sa potrzebne do listy wyboru przy dopisywaniu starszego badania -
// historia zna tylko te badania, ktore juz w niej sa.
export function historyLoader({
  request,
}: {
  request: Request;
}): Promise<HistoryData> {
  return Promise.all([
    fetchScreeningHistory(request.signal),
    fetchScreeningRules(request.signal),
  ])
    .then(([history, rules]) => ({ history, rules }))
    .catch(redirectOnUnauthorized);
}
