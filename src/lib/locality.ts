import { displayPlacePart } from "@/lib/location";

/** The address parts this formatter reads. All optional, all possibly blank. */
export type LocalityParts = {
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

const trimmed = (v: string | null | undefined) => displayPlacePart(v);

export function formatLocality(parts: LocalityParts): string | null {
  const city = trimmed(parts.city);
  const state = trimmed(parts.state);
  const postalCode = trimmed(parts.postalCode);

  const region = [state, postalCode].filter(Boolean).join(" ");
  return [city, region || null].filter(Boolean).join(", ") || null;
}
