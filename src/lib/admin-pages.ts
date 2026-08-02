import type { Tile } from "@/components/console/ConsolePage";

/**
 * THE ADMIN PAGE SPEC, one table, straight off the 2.5 deck (WS2).
 *
 * Every console page is the same shape — 4 KPI tiles → listing → Volume Last 90
 * Days — so the pages are DATA here and one renderer draws them. Fourteen
 * hand-written page files would be fourteen chances for a column list to drift
 * from the slide it came from.
 *
 * NUMBERS ARE ABSENT ON PURPOSE. The deck fills its tiles with "9" and its
 * volume strip with "99"; those are visual filler, and Scott's instruction is
 * no fabricated numbers. So a metric that is DEFINED but unmeasurable renders
 * "—", and a slot the deck marks TBD renders a labelled TBD placeholder. The
 * two are different questions and look different.
 */

const TBD4: Tile[] = [{ tbd: true }, { tbd: true }, { tbd: true }, { tbd: true }].map(
  (t) => ({ ...t, label: "TBD" })
);
const TBD5: Tile[] = Array.from({ length: 5 }, () => ({ label: "TBD", tbd: true }));

/** The four tiles Work Requests / Orders / Packages share (deck slides 3–5). */
const WORK_TILES: Tile[] = [
  { label: "Open Work Requests" },
  { label: "Open Work Orders" },
  { label: "Work Requests in Last 30 Days" },
  { label: "Work Orders in Last 30 Days" },
];

const WHY_TRANSACTION =
  "The transaction layer isn't built — there is no Work Request, Order, Contract or Payment model to read from. This page is the shape they will land in.";

export type AdminPageSpec = {
  tiles: Tile[];
  listingTitle: string;
  columns: string[];
  /** Noun for the empty state ("work requests"). */
  what: string;
  why?: string;
  volume?: Tile[];
  volumeTitle?: string;
};

export const ADMIN_PAGES: Record<string, AdminPageSpec> = {
  "work-requests": {
    tiles: WORK_TILES,
    listingTitle: "Work Requests",
    columns: ["Time", "Requester - Company", "Role", "Status", "Start Date", "Message"],
    what: "work requests",
    why: WHY_TRANSACTION,
    volume: [
      { label: "Work Requests" },
      { label: "Work Orders" },
      { label: "Invites" },
      { label: "Proposals" },
      { label: "Interviews" },
    ],
  },
  "work-orders": {
    tiles: WORK_TILES,
    listingTitle: "Work Orders",
    columns: ["Provider - Company", "Package", "Status", "Posted Date", "Message"],
    what: "work orders",
    why: WHY_TRANSACTION,
    volume: [
      { label: "F&A (ERP) WOs" },
      { label: "HCM WOs" },
      { label: "SCM WOs" },
      { label: "CRM WOs" },
      { label: "EPM WOs" },
    ],
  },
  "work-packages": {
    tiles: WORK_TILES,
    listingTitle: "Work Packages",
    columns: ["Provider - Company", "Package", "Status", "Posted Date", "Message"],
    what: "work packages",
    why: WHY_TRANSACTION,
    volume: [
      { label: "F&A (ERP) Packages" },
      { label: "HCM Packages" },
      { label: "SCM Packages" },
      { label: "CRM Packages" },
      { label: "EPM Packages" },
    ],
  },
  contracts: {
    tiles: TBD4,
    listingTitle: "Contracts",
    columns: ["Provider - Company", "Title", "Status", "Posted Date", "Message"],
    what: "contracts",
    why: WHY_TRANSACTION,
    volume: TBD5,
  },
  /*
    Settlements follows the BRIEF, not slide 7. The slide carries Work Packages'
    body verbatim — ERP-pillar volume tiles and a "Package" column — which
    Scott confirmed is a copy-paste artifact (2026-08-02). TBD tiles, Title
    column, TBD volume.
  */
  settlements: {
    tiles: TBD4,
    listingTitle: "Settlements",
    columns: ["Provider - Company", "Title", "Status", "Posted Date", "Message"],
    what: "settlements",
    why: WHY_TRANSACTION,
    volume: TBD5,
  },
  payments: {
    tiles: TBD4,
    listingTitle: "Payments",
    columns: ["Provider - Company", "Title", "Status", "Posted Date", "Message"],
    what: "payments",
    why: WHY_TRANSACTION,
    volume: TBD5,
  },
  specializations: {
    tiles: TBD4,
    listingTitle: "Specializations",
    columns: ["Provider - Company", "Title", "Status", "Posted Date", "Message"],
    what: "specialization records",
    volume: TBD5,
  },
  /*
    Industries follows the BRIEF, not slide 14. That slide reuses slide 13's
    body — its listing still reads "Specializations" and its footer says
    "Volume Over Time" with "?" — confirmed a copy-paste artifact.
  */
  industries: {
    tiles: TBD4,
    listingTitle: "Industries",
    columns: ["Provider - Company", "Title", "Status", "Posted Date", "Message"],
    what: "industry records",
    volume: TBD5,
  },
};
