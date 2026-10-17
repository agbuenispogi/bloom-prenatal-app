// Settings speak to whoever is reading: "you/your" for her, "she/her" when Ag (the caregiver) reads.
export type Viewer = "patient" | "caregiver";

export function voice(viewer: Viewer) {
  const me = viewer === "patient";
  return {
    subjTakes: me ? "you take" : "she takes",
    your: me ? "your" : "her",
    Your: me ? "Your" : "Her",
    taps: me ? "you tap" : "she taps",
  };
}
