
export type Audience = "neutral" | "buyer" | "provider";

export const AUDIENCE_PATH: Record<Audience, string> = {
  neutral: "/",
  buyer: "/",
  provider: "/work",
};

// ---------------------------------------------------------------------------
// THREE PUBLIC PAGES (brief_public_pages_ia WS-4).
//
// `Audience` above is about VOICE — does this section speak to a buyer or a
// seller — and sections keep using it. This is about ROUTING: which of the
// three public pages is on screen. They are deliberately separate concepts,
// because the home and Hire Talent are both buyer-voiced but are different
// destinations with different jobs, and collapsing the two would force the
// switch to treat them as one place.
// ---------------------------------------------------------------------------

export type PublicPage = "home" | "hire" | "work";

export const PUBLIC_PAGES: {
  key: PublicPage;
  href: string;
  /** What the switch calls it — the visitor's job, not our label for them. */
  label: string;
  /** Which voice the page's sections speak in. */
  audience: Audience;
}[] = [
  { key: "home", href: "/", label: "See where I stand", audience: "buyer" },
  { key: "hire", href: "/talent", label: "I want to hire", audience: "buyer" },
  { key: "work", href: "/work", label: "I want to work", audience: "provider" },
];

export const publicPageHref = (key: PublicPage) =>
  PUBLIC_PAGES.find((p) => p.key === key)!.href;
