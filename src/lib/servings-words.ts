// Words for an any-time item (counted per day, e.g. Anmum Materna, Gaviscon as needed, a multivitamin).
// A drink is had by the glass; a medicine is taken by its own unit (tablet, capsule) or as "a dose". Pure.
export interface ServingWords {
  drink: boolean;
  unit: string; // "glass", "tablet", "dose"
  count: (n: number) => string; // "1 glass", "2 tablets"
  nudge: string; // after the reminder time, still below the minimum
  button: string; // the one-tap log
}

const DRINK = /\b(glass|glasses|cup|cups|milk|drink)\b/i;
const UNIT = /\b(tablet|capsule|caplet|sachet|softgel|scoop)s?\b/i;

export function servingWords(name: string, doseLabel: string): ServingWords {
  const drink = DRINK.test(`${doseLabel} ${name}`);
  const unit = drink ? "glass" : (UNIT.exec(doseLabel)?.[1]?.toLowerCase() ?? "dose");
  const plural = unit === "glass" ? "glasses" : `${unit}s`;
  return {
    drink,
    unit,
    count: (n) => `${n} ${n === 1 ? unit : plural}`,
    nudge: drink ? "Not yet today. A glass before bed?" : "Not yet today. Take it before bed?",
    button: drink ? "Had a glass" : `Took ${unit === "dose" ? "a dose" : `a ${unit}`}`,
  };
}
