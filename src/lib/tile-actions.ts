import type { AttentionItem } from "@/lib/attention";

// NC-E004: which Worklist groups belong to which tile, so each tile can say "2 Actions Required →" (or "1 Overdue →").
export const TILE_GROUPS: Record<string, string[]> = {
  jobs: ["Compare Answers", "Answer Date Passed", "Availability Requests", "Questions to Answer", "Jobs for You"],
  requests: ["Request Approvals"],
  orders: ["Orders to Accept", "Review Change Orders"],
  payments: ["Approve Invoices"],
  account: ["Set-Up"],
  profile: ["Profile"],
  connect: ["Requests to Connect", "Recommendations", "Mentors & Groups"],
  connections: ["Requests to Connect"],
  recommendations: ["Recommendations"],
  mentors: ["Mentors & Groups"],
  estimates: ["Estimates", "Compare Estimates"],
  fit: ["Interview Times to Pick", "Interview Times to Confirm", "Tests to Take"],
  providers: ["Compare Answers"],
  catalog: ["Respond to Offers", "Accept Product Orders"],
  products: ["Answer Counter-Offers"],
};

export type ActionCount = { n: number; overdue: number; href: string };
/** Overdue = past due or due within 24 h. */
export function countActions(groups: AttentionItem[], href: string, match?: (g: AttentionItem) => boolean): ActionCount {
  const soon = Date.now() + 86_400_000;
  const lines = groups.filter((g) => !match || match(g)).flatMap((g) => g.lines ?? []);
  return { n: lines.length, overdue: lines.filter((l) => l.dueAt && Date.parse(l.dueAt) < soon).length, href };
}
export const tileCount = (groups: AttentionItem[], tile: string, app?: string): ActionCount =>
  countActions(groups, `/worklist?${app ? `app=${app}&` : ""}tile=${tile}`, (g) => (TILE_GROUPS[tile] ?? []).includes(g.title ?? g.what));
