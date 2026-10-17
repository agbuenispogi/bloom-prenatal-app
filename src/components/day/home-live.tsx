"use client";

import { eatMeal, goingToBed, intendMeal, logServing, logSnack, skipBreakfast, skipDose, snoozeDose, takeDose } from "@/app/actions/day";
import type { DayAction, DayActionResult, HomeView as View } from "@/lib/view/home";
import { HomeView } from "./home-view";

// Live Home: every action is a server action; the server revalidates and streams the new view.
function run(a: DayAction): Promise<DayActionResult> {
  switch (a.type) {
    case "take":
      return takeDose({ ruleId: a.ruleId, occurrence: a.occurrence });
    case "snooze":
      return snoozeDose({ ruleId: a.ruleId, occurrence: a.occurrence, minutes: a.minutes });
    case "skip":
      return skipDose({ ruleId: a.ruleId, occurrence: a.occurrence, reason: a.reason });
    case "intend":
      return intendMeal({ meal: a.meal, minutes: a.minutes });
    case "eat":
      return eatMeal({ meal: a.meal, time: a.time });
    case "snack":
      return logSnack({ time: a.time });
    case "skipBreakfast":
      return skipBreakfast();
    case "bed":
      return goingToBed();
    case "serving":
      return logServing({ ruleId: a.ruleId });
  }
}

export function HomeLive({ view, tz }: { view: View; tz: string }) {
  return <HomeView view={view} tz={tz} run={run} />;
}
