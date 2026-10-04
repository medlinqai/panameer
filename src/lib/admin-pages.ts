import type { Tile } from "@/components/console/ConsolePage";

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

const WHY_TRANSACTION = "Not counted yet";

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
    columns: ["Provider - Company", "ServiceProduct", "Status", "Posted Date", "Message"],
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
    columns: ["Provider - Company", "ServiceProduct", "Status", "Posted Date", "Message"],
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
  industries: {
    tiles: TBD4,
    listingTitle: "Industries",
    columns: ["Provider - Company", "Title", "Status", "Posted Date", "Message"],
    what: "industry records",
    volume: TBD5,
  },
};
