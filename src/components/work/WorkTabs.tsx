"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";

// MD-E001: SELL | My Catalog · Jobs for You · Requests · Interviews · Tests — red counts from appCounts().
const FIND = new Set(["best", "recent", "us", "saved"]);
export type JobsBadges = { overview: number; invitations: number; interviews: number; tests: number };

export function WorkTabs({ badges }: { badges: JobsBadges }) {
  const pathname = usePathname() ?? "";
  const tab = useSearchParams()?.get("tab");
  const current = pathname === "/catalog" || pathname.startsWith("/catalog/") ? "/catalog" : pathname === "/find-work" ? (!tab || FIND.has(tab) ? "/find-work?tab=best" : `/find-work?tab=${tab}`) : "";
  const badgeFor = (href: string) => (href.endsWith("=best") ? undefined : href.endsWith("=invitations") ? badges.invitations : href.endsWith("=interviews") ? badges.interviews : href.endsWith("=tests") ? badges.tests : undefined);
  const tabs = PAGE_TABS["/find-work"].map((t) => ({ label: t.label, href: t.href, badge: badgeFor(t.href) }));
  return <PageTabs wrap eyebrow="Sell" tabs={tabs} current={current} />;
}
