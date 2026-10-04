
/** `--navy` — identical to `--color-ink`. */
export const INK = "#272334";
/** `--mag` — identical to `--color-magenta`. The rail colour. */
export const MAG = "#D72CD6";
/** `--magink` — identical to `--color-magenta-ink`. Rail LABELS only. */
export const MAGINK = "#A61AA5";
export const INK2 = "#5B6183";
export const LINE = "#E3E6EF";
export const GREY = "#8A90AE";
export const PILL = "#EDEEF4";

/** Lane tints, as written. ERP / Panameer AIP / Provider-Supplier. */
export const ERP = "#EDF1FA";
export const ERP_EDGE = "#C3CFEA";
export const ERP_INNER = "#DDE5F6";
export const AIP = "#FAE9FA";
export const AIP_EDGE = "#E7B9E6";
export const AIP_INNER = "#F4D7F3";
export const PRO = "#E8F5F8";
export const PRO_EDGE = "#B4D8E1";

export const T = {
  lane: {
    fontFamily: "var(--font-display), Comfortaa, cursive",
    fontWeight: 700,
    fontSize: 15,
    fill: INK,
  },
  cap: { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.09em", fill: INK2 },
  n: { fontSize: 11, fontWeight: 600, fill: INK },
  ns: { fontSize: 8.5, fontWeight: 500, fill: INK2 },
  pl: { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.07em", fill: INK2 },
  rl: { fontSize: 7.5, fontWeight: 700, letterSpacing: "0.05em", fill: MAGINK },
  st: { fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", fill: "#fff" },
} as const;

export const LEGEND_KEYS = (third: string) => [
  { swatch: ERP, label: "ERP Application — your system of record" },
  { swatch: AIP, label: "Panameer AIP" },
  { swatch: PRO, label: third },
  { swatch: MAG, label: "Panameer ↔ ERP rail", solid: true },
];
