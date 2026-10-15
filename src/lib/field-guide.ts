import data from "../../scripts/data/search-attributes-2026-10-15.json";

// Lane 6: the Field Guide tab — the ? help on each field, in seller and buyer wording (client-safe; no database).
const GUIDE = Object.fromEntries((data.fieldGuide as { field: string; seller: string; buyer: string }[]).map((g) => [g.field, g]));
export const fieldHelp = (field: "Business Type" | "What I Do" | "Industry" | "Attributes" | "Keywords" | "Credentials" | string, who: "seller" | "buyer") => GUIDE[field]?.[who] ?? null;
