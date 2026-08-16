import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { buildReport } from "@/lib/assessment/report";
import { ReportDashboard } from "@/components/assessment/ReportDashboard";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const m = await buildReport(token);
  return { title: m ? `${m.companyName} — AI opportunity report` : "Report — Panameer" };
}

/**
 * THE REPORT, at its share URL.
 *
 * ── THE TOKEN IS THE ACCESS CONTROL, AND THAT IS DELIBERATE ──────────────────
 *
 * No session required. The URL is a uuid, mailed only to the address the person
 * typed, and it is also the thing they forward to a colleague or open on a
 * phone — which is the whole product requirement ("shareable"). Requiring a
 * login would break the share and would break the magic-link landing, since
 * /assess/claim signs in and redirects HERE.
 *
 * That is why it sits on the public allowlist in route-access.ts with the other
 * token links (/verify/[credentialId], /validate/[token], /recommend/[token]) —
 * the same class of URL, governed by the same rule in NAV_MODEL_LOCKED.
 *
 * ── PUBLIC HEADER, NOT THE CASING ────────────────────────────────────────────
 *
 * The reader may or may not have a session — they usually do by the time they
 * land here, but a forwarded link means they might not. The nav model forbids
 * the casing on a page a logged-out visitor can reach, so this renders the
 * public header either way. One chrome, no branch, nothing that changes shape
 * depending on who opened the link.
 */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  /**
   * `?emailed=1` — set by the submit redirect, and ONLY when
   * `/api/assessment` confirmed the send. It is a flag, not the address: the
   * report already knows the address, and an email in a URL ends up in browser
   * history, server logs and referrers.
   */
  searchParams: Promise<{ emailed?: string }>;
}) {
  const { token } = await params;
  const { emailed } = await searchParams;
  const model = await buildReport(token);
  if (!model) notFound();

  return (
    <div className="marketing-surface flex min-h-screen flex-col bg-white font-body text-ink">
      <MarketingHeader />
      <main className="flex-1">
        <ReportDashboard model={model} emailedTo={emailed === "1" ? model.email : null} />
      </main>
    </div>
  );
}
