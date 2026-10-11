"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { PageTabs } from "@/components/casing/PageTabs";
import { PAGE_TABS } from "@/lib/nav";

// WS-E002: WORK | Home · Best Matches · All Work Requests · Invitations (count) · My Proposals · Saved.
export function WorkTabs({ invitations }: { invitations: number }) {
  const pathname = usePathname() ?? "";
  const tab = useSearchParams()?.get("tab");
  const current = pathname === "/find-work" ? (tab ? `/find-work?tab=${tab}` : "/find-work") : "";
  const tabs = PAGE_TABS["/find-work"].map((t) => ({ label: t.label, href: t.href, badge: t.href.endsWith("=invitations") ? invitations : undefined }));
  return <PageTabs wrap eyebrow="Work" tabs={tabs} current={current} />;
}
