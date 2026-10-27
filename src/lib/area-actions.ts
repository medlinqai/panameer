import { todoGroups } from "@/lib/todo";
import { countActions } from "@/lib/tile-actions";
import type { ActionCard } from "@/components/home/AppNav";

// WA-E003: What You Can Do = this area's actions only. Variable cards (only when there's something to do, with a count,
// gold — red if any is overdue) come first and are the area's Worklist items; the fixed cards are always there.
type Variable = { label: string; groups: string[]; href: string; icon: ActionCard["icon"] };
const VARIABLE: Record<string, Variable[]> = {
  work: [
    { label: "New Matches", groups: ["Jobs for You"], href: "/work/jobs?stage=You%20Matched", icon: "search" },
    { label: "Respond with Availability", groups: ["Availability Requests", "Questions to Answer"], href: "/work/jobs?stage=They%20Requested", icon: "send" },
    { label: "Send Estimate", groups: ["Estimates"], href: "/work/estimates?stage=asked", icon: "calc" },
    { label: "Respond to Offer", groups: ["Respond to Offers"], href: "/shop?tab=offers", icon: "tag" },
    { label: "Pick Interview Time", groups: ["Interview Times to Pick"], href: "/work/jobs?stage=You%20Interviewed", icon: "users" },
    { label: "Take Requested Test", groups: ["Tests to Take"], href: "/work/jobs?stage=You%20Interviewed", icon: "award" },
    { label: "Accept Product Order", groups: ["Accept Product Orders"], href: "/work/product-orders?stage=To%20Accept", icon: "package" },
  ],
  connect: [
    { label: "Accept Connection", groups: ["Requests to Connect"], href: "/connect/connections", icon: "userPlus" },
    { label: "Write Recommendation", groups: ["Recommendations"], href: "/connect/recommendations", icon: "star" },
    { label: "Answer Mentor Request", groups: ["Mentors & Groups"], href: "/connect/mentors", icon: "group" },
  ],
  hire: [
    { label: "Compare Answers", groups: ["Compare Answers"], href: "/hire/overview?tab=jobs&slice=comparing", icon: "compare" },
    { label: "Decide on Answer Date", groups: ["Answer Date Passed"], href: "/hire/overview?tab=jobs", icon: "list" },
    { label: "Confirm Interview Time", groups: ["Interview Times to Confirm"], href: "/hire/overview?tab=interviews", icon: "users" },
    { label: "Approve Request", groups: ["Request Approvals"], href: "/hire/overview?tab=requests", icon: "receipt" },
  ],
  shop: [
    { label: "Answer Counter-Offer", groups: ["Answer Counter-Offers"], href: "/shop?tab=offers", icon: "tag" },
    { label: "Compare Estimates", groups: ["Compare Estimates"], href: "/estimate?tab=in", icon: "calc" },
  ],
  orders: [
    { label: "Accept Order", groups: ["Orders to Accept"], href: "/orders/overview", icon: "receipt" },
    { label: "Review Change Order", groups: ["Review Change Orders"], href: "/orders/overview", icon: "pen" },
    { label: "Recommend Provider", groups: ["Recommend Your Provider"], href: "/worklist?group=Recommend%20Your%20Provider", icon: "star" },
    { label: "Ask for Recommendation", groups: ["Ask for a Recommendation"], href: "/connect/recommendations", icon: "star" },
  ],
  payments: [
    { label: "Approve Invoice", groups: ["Approve Invoices"], href: "/payments/payment-requests", icon: "receipt" },
  ],
  learn: [],
};

export const FIXED: Record<string, ActionCard[]> = {
  work: [
    { label: "Browse Jobs", href: "/find-work?tab=recent", icon: "search" },
    { label: "Jobs Matching Your Skills", href: "/find-work?tab=best", icon: "briefcase" },
    { label: "Shop Products", href: "/shop?tab=browse", icon: "cart" },
    { label: "Update Services & Rates", href: "/catalog#services", icon: "tag" },
    { label: "Update Service Products", href: "/catalog#products", icon: "package" },
  ],
  connect: [
    { label: "Invite People", href: "/connect/invite", icon: "userPlus" },
    { label: "Find People", href: "/connect/community", icon: "users" },
    { label: "Get Recommended", href: "/connect/recommendations", icon: "star" },
    { label: "Join a Group", href: "/connect/groups", icon: "group" },
    { label: "See Leaders", href: "/connect/leaders", icon: "trophy" },
  ],
  hire: [
    { label: "Create a Job", href: "/hire", icon: "briefcase" },
    { label: "Find People", href: "/connect/community", icon: "users" },
    { label: "Compare Providers", href: "/hire/overview?tab=jobs&slice=comparing", icon: "compare" },
    { label: "Write Questions", href: "/hire/overview?tab=questions", icon: "list" },
  ],
  shop: [
    { label: "Browse Products", href: "/shop?tab=browse", icon: "search" },
    { label: "Get an Estimate", href: "/estimate/new", icon: "calc" },
    { label: "Open Cart", href: "/shop?tab=cart", icon: "cart" },
    { label: "See Purchases", href: "/shop?tab=purchases", icon: "receipt" },
  ],
  orders: [
    { label: "All Orders", href: "/orders/overview", icon: "receipt" },
    { label: "Requests", href: "/orders/work-requests", icon: "list" },
  ],
  payments: [
    { label: "Payment Requests", href: "/payments/payment-requests", icon: "receipt" },
    { label: "Payments", href: "/payments", icon: "calc" },
  ],
};

/** The area's cards: variable ones first (count badge; red when overdue), then the fixed ones. `extra` adds counted cards that aren't Worklist items. */
export async function areaActions(area: string, personId: string, side: "buyer" | "provider", fixed: ActionCard[] = FIXED[area] ?? [], extra: ActionCard[] = []): Promise<ActionCard[]> {
  const groups = (VARIABLE[area] ?? []).length ? await todoGroups(personId, side) : [];
  const variable = (VARIABLE[area] ?? []).map((v) => {
    const c = countActions(groups, v.href, (g) => v.groups.includes(g.title ?? g.what));
    return { label: v.label, href: v.href, icon: v.icon, count: c.n, overdue: c.overdue > 0 };
  }).filter((c) => c.count > 0);
  return [...variable, ...extra.filter((c) => (c.count ?? 0) > 0), ...fixed];
}
