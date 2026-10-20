// NA-E002: masked providers never get a photo (not even blurred) — only placeholder text for blurred fields is left here.
export const PLACEHOLDER = {
  /** A name-shaped bar. Rendered blurred, never as readable text. */
  name: "Anskeld Marrowen",
  employer: "Verthane Industries",
  client: "Oridane Group",
  rate: "$000 / hr",
  contact: "name@example.com",
} as const;
