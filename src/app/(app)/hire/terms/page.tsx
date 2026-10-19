import { notFound } from "next/navigation";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { hireDefaults } from "@/lib/hire-direct";
import { HireTermsForm } from "@/components/hire/HireTermsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Work Request · Hire · Panameer" };

// HS-E005: Hire step 10–11 — the buyer confirms the Terms, then Create Work Order.
export default async function Page({ searchParams }: { searchParams: Promise<{ job?: string; provider?: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const sp = await searchParams;
  if (!sp.job || !sp.provider) notFound();
  const d = await hireDefaults(viewer, sp.job, sp.provider);
  if (!d) notFound();
  return (
    <div className="pm-white-page mx-auto w-full max-w-3xl">
      <p className="mt-2 text-[13px]"><Link href={`/work-requests/${d.jobId}`} className="font-semibold text-magenta-dark">← {d.jobTitle || "The job"}</Link></p>
      <h1 className="mt-1 text-[26px] font-extrabold">Work Request</h1>
      <p className="text-[14px] text-ink-2">Hiring {d.providerCompany ? `${d.providerCompany} · ` : ""}{d.providerName}. Check the terms and submit. Once the Work Request is approved, the Work Order is created and {d.identityShown ? d.providerName.split(" ")[0] : "the provider"} accepts it there.</p>
      <HireTermsForm d={d} />
    </div>
  );
}
