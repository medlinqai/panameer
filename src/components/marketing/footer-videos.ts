/**
 * THE THREE VIDEO COLUMNS IN THE FOOTER (`P1-ALL-E020`).
 *
 * ⚠⚠ EVERY ITEM IS PLAIN TEXT. THERE IS NO `href` FIELD ON PURPOSE — the type
 * cannot carry one, so nobody can add a destination without changing the shape.
 * Scott: *"I will come back and fill in the links to the videos after i create
 * them...after the pages have been built."*
 *
 * ⚠ AND NO `TBD` BADGE EITHER. That marker exists for UNBUILT PAGES a reader
 * might otherwise expect to click; these are a COMING LIBRARY, which is a
 * different thing, and badging thirty-two rows would be noise.
 *
 * ── ⚠ TWO THINGS SHIPPED AS SCOTT TYPED THEM, BOTH REPORTED ────────────────
 *
 * 1. `Services Procurement Punchout` vs `Service Procurement Fulfillment` /
 *    `Service Procurement Settlement` — SINGULAR in two, PLURAL in one. ⚠ HIS
 *    TYPING, NOT NORMALISED. Three adjacent rows disagreeing on one word is
 *    visible, so it is reported rather than silently fixed.
 * 2. `Crate Optimization Dashboard` -> `Create`. ⚠ CORRECTED AS A TYPO under the
 *    standing `uase`->`use` precedent, and flagged so he can overrule.
 */
export type FooterVideoColumn = {
  /** ⚠ SENTENCE CASE, display face. Not an ALL-CAPS eyebrow. */
  title: string;
  items: string[];
};

export const FOOTER_VIDEO_COLUMNS: FooterVideoColumn[] = [
  {
    title: 'Seller "How To" Videos',
    items: [
      "Sell Consulting Hours",
      "Sell Retainer Hours",
      "Sell Pre-Defined Application Demos",
      "Sell Process-Specific AI Agent Suites",
      "Sell Pre-Defined Integrations (e.g. Docusign)",
      "Sell Pre-Built Reports & Dashboards",
      "Sell Mentoring Services",
      "Sell Support Services",
    ],
  },
  {
    title: 'Buyer "How To" Videos',
    items: [
      "Post Free Work Requests (Jobs)",
      /* ⚠ `Create`, not his typed `Crate`. Reported. */
      "Create Optimization Dashboard",
      "Create 1 Year AI Roadmap",
      "Buy Application Demonstrations",
      "Buy Pre-Built Dashboards & Reports",
      "Buy Process-Based AI Agent Suites",
      "Buy Pre-Project Expert Consultations",
      "Buy Production Support Direct from Expert",
    ],
  },
  {
    title: "Panameer Solution Videos",
    items: [
      "Process-Specific AI Agents",
      /* ⚠ `Services` here, `Service` in the next two. His typing. */
      "Services Procurement Punchout",
      "Service Procurement Fulfillment",
      "Service Procurement Settlement",
      "Dynamic Analytics (Data Driven)",
      "AI Agents Launched from the AIP",
      "The AI Method (aka AIM)",
      "The Panameer E2E Work Tracker",
    ],
  },
];

/**
 * ⚠ INLINE SVG PATHS, NOT FILES. There is no icon set in `public/brand`, and an
 * inline `<svg>` drawn with `currentColor` recolours on hover with the rest of
 * the footer — an `<img>` cannot.
 *
 * ⚠ NO WHATSAPP. Scott listed it but gave no destination, and an icon that goes
 * nowhere is worse than an absent one. Asked for in the report.
 */
export const FOOTER_SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: "YouTube",
    href: "https://www.youtube.com/c/panameer",
    path: "M23.5 6.2A3 3 0 0 0 21.4 4C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8A3 3 0 0 0 2.6 20c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.2c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/onpanameer",
    path: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 5.1A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3Zm0 7.7A3 3 0 1 1 15 12a3 3 0 0 1-3 3Zm6-7.9a1.1 1.1 0 1 1-1.1-1.1 1.1 1.1 0 0 1 1.1 1.1Z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/panameer/",
    path: "M20.4 20.5h-3.6v-5.6c0-1.3-.5-2.3-1.7-2.3-1 0-1.5.6-1.8 1.3-.1.2-.1.5-.1.9v5.7H9.6s.1-9.3 0-10.3h3.6v1.5c.5-.7 1.3-1.8 3.2-1.8 2.4 0 4.1 1.5 4.1 4.8v5.8ZM5.8 8.8h-.1A1.9 1.9 0 0 1 3.7 7c0-1.1.8-1.9 2.1-1.9s2.1.8 2.1 1.9-.8 1.8-2.1 1.8Zm1.8 11.7H4V10.2h3.6v10.3Z",
  },
  {
    label: "X",
    href: "https://x.com/onpanameer",
    path: "M18.2 2.3h3.3l-7.2 8.3 8.5 11.1h-6.7l-5.2-6.9-6 6.9H1.6l7.7-8.8L1.1 2.3h6.9l4.9 6.4 5.3-6.4Zm-1.2 17.5h1.8L6.1 4.1H4.2l12.8 15.7Z",
  },
];
