/** A comma list ("Procurement, OTBI, Core HR") becomes one item each; a leading "LABEL:" is dropped. */
export const splitList = (s: string) =>
  [...new Set(s.replace(/^[A-Za-z ]{3,30}:\s*/, "").split(/[,;\n•]+/).map((x) => x.trim()).filter((x) => x.length > 1))].slice(0, 30);
