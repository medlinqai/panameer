export type RoadmapMilestone = {
  key: string;
  action: string;
  resource: string;
  weeks: string;
  owner: string;
  isPartner: boolean;
};

export const ROADMAP_MILESTONES: RoadmapMilestone[] = [
  { key: "invoice_match", action: "Invoice match exceptions", resource: "Deliverable", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "po_price", action: "PO price alerts", resource: "Deployable", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "rogue_spend", action: "Rogue-spend alert", resource: "Deployable", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "contract_reneg", action: "Contract renegotiation", resource: "Expert’s hours", weeks: "4 wks", owner: "StratERP", isPartner: true },
  { key: "supplier_docs", action: "Supplier doc validation", resource: "Deployable", weeks: "2 wks", owner: "Panameer", isPartner: false },
];

/** "Deployable · 2 wks", plus an optional state tail for the tracker. */
export const milestoneDetail = (m: RoadmapMilestone, tail?: string) =>
  [m.resource, m.weeks, tail].filter(Boolean).join(" · ");

export const milestoneByKey = (key: string) => {
  const m = ROADMAP_MILESTONES.find((x) => x.key === key);
  if (!m) throw new Error(`roadmap-milestones: no milestone with key "${key}"`);
  return m;
};
