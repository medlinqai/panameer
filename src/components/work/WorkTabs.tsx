"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";
import { useMe } from "@/components/MeProvider";

// JW-E008: JOBS | Find Jobs · Best Matches · All Jobs · My Jobs (buyers) · Proposal Requests (count) · My Proposals · Saved.
export function WorkTabs({ invitations }: { invitations: number }) {
  const pathname = usePathname() ?? "";
  const tab = useSearchParams()?.get("tab");
  const current = pathname === "/find-work" ? (tab ? `/find-work?tab=${tab}` : "/find-work") : "";
  const { me } = useMe();
  // Same rule as the /hire guard (canHireTalent = isServiceBuyer), so the tab never leads to a no-access bounce.
  const buys = !!me?.person?.roles?.isServiceBuyer;
  const tabs = PAGE_TABS["/find-work"].filter((t) => t.requires !== "canHireTalent" || buys).map((t) => ({ label: t.label, href: t.href, badge: t.href.endsWith("=invitations") ? invitations : undefined }));
  return <PageTabs wrap eyebrow="Jobs" tabs={tabs} current={current} />;
}
