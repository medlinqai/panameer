
export type Move = {
  /** The capability domain this move answers. */
  domain: string;
  title: string;
  /** One line of what it does, in the owner's language. */
  detail: string;
  /** A BAND, never a date. */
  timeline: string;
  resource: string;
};

export const P2P_MOVES: Record<string, Move> = {
  invoices: {
    domain: "invoices",
    title: "Auto-match invoices to POs & receipts",
    detail: "Cuts AP keying and errors — invoices match themselves, exceptions route to a person.",
    timeline: "~4–8 weeks",
    resource: "A Procurement functional + an integration tech",
  },
  sourcing: {
    domain: "sourcing",
    title: "Sourcing & price benchmarking",
    detail: "The hard-dollar one — “we pay X for Y, beat it” against real market data.",
    timeline: "~4–6 weeks",
    resource: "A sourcing specialist",
  },
  supplier_risk: {
    domain: "supplier_risk",
    title: "Supplier self-service portal",
    detail: "Onboarding, documents and invoices the suppliers run themselves.",
    timeline: "~6 weeks",
    resource: "A Procurement functional + a portal/integration tech",
  },
  requisitioning: {
    domain: "requisitioning",
    title: "Guided requests with policy built in",
    detail: "People ask for what they need in one place; approvals and policy route themselves.",
    timeline: "~3–6 weeks",
    resource: "A Procurement functional",
  },
  contracts: {
    domain: "contracts",
    title: "Contract repository with renewal alerts",
    detail: "One place for supplier terms, with the renewal dates surfacing before they pass.",
    timeline: "~4–6 weeks",
    resource: "A Procurement functional + a document/AI specialist",
  },
  purchase_orders: {
    domain: "purchase_orders",
    title: "Purchase orders that flow end to end",
    detail: "Orders created from approved requests and tracked through receipt and invoice.",
    timeline: "~4–8 weeks",
    resource: "A Procurement functional + an integration tech",
  },
  receiving: {
    domain: "receiving",
    title: "Receipt capture and three-way matching",
    detail: "Confirm what actually arrived, so you stop paying for what didn't.",
    timeline: "~3–6 weeks",
    resource: "A Procurement functional",
  },
  payments: {
    domain: "payments",
    title: "Scheduled payment runs with discount capture",
    detail: "Pay on terms rather than on memory, and take the early-pay discounts you're owed.",
    timeline: "~4–6 weeks",
    resource: "A finance functional + a banking/integration tech",
  },
};

export function moveFor(domainKey: string): Move | null {
  return P2P_MOVES[domainKey] ?? null;
}
