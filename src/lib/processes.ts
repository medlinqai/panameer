import { P2P_DOMAINS } from "@/lib/capability-domains";

export type ProcessStatus = "live" | "coming-soon";

export type BusinessProcess = {
  key: string;
  /** The three-letter trade name, shown above the title. */
  abbr: string;
  name: string;
  /** One line, the mockup's `.p-card__line`. */
  blurb: string;
  domainCount: number | null;
  status: ProcessStatus;
  media: string;
  /** Accent hue for the gradient fallback — 8-digit hex, alpha included. */
  tint: string;
  /** Dark base the accent sits on. */
  deep: string;
};

export const PROCESSES: BusinessProcess[] = [
  {
    key: "p2p",
    abbr: "P2P",
    name: "Procure-to-Pay",
    blurb:
      "Requisitions, sourcing, procurement contracts, purchase orders, receipts, invoices, and payments.",
    /* DERIVED, never typed — see the field comment. */
    domainCount: P2P_DOMAINS.length,
    status: "live",
    media: "",
    tint: "#c026a888",
    deep: "#2b1b4d",
  },
  {
    key: "o2c",
    abbr: "O2C",
    name: "Order-to-Cash",
    blurb: "Quote, order, billing, collections and cash application.",
    domainCount: null,
    status: "coming-soon",
    media: "",
    tint: "#1f86c988",
    deep: "#12304d",
  },
  {
    key: "r2r",
    abbr: "R2R",
    name: "Record-to-Report",
    blurb: "Journals, reconciliations, close orchestration and reporting.",
    domainCount: null,
    status: "coming-soon",
    media: "",
    tint: "#17a08a88",
    deep: "#123d38",
  },
  {
    key: "h2r",
    abbr: "H2R",
    name: "Hire-to-Retire",
    blurb: "Recruiting, onboarding, payroll, time and workforce admin.",
    domainCount: null,
    status: "coming-soon",
    media: "",
    tint: "#c9761f88",
    deep: "#3d2415",
  },
];
