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

/** THE REPORT, at its share URL. */
export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  /** report already knows the address, and an email in a URL ends up in browser */
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
