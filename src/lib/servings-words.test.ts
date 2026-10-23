import { describe, expect, it } from "vitest";
import { servingWords } from "./servings-words";

describe("any-time item wording", () => {
  it("milk is a drink, by the glass", () => {
    const w = servingWords("Anmum Materna", "1 glass");
    expect(w).toMatchObject({ drink: true, unit: "glass", button: "Had a glass" });
    expect(w.count(2)).toBe("2 glasses");
  });
  it("medicines are taken, never 'a glass'", () => {
    expect(servingWords("Gaviscon", "10 ml")).toMatchObject({ drink: false, unit: "dose", button: "Took a dose" });
    expect(servingWords("Gaviscon", "10 ml").nudge).not.toMatch(/glass/);
    const vit = servingWords("Multi Vitamins Obamin", "1 tablet");
    expect(vit).toMatchObject({ unit: "tablet", button: "Took a tablet" });
    expect(vit.count(1)).toBe("1 tablet");
  });
});
