import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { eventForBuyer } from "@/lib/sourcing-events";
import { WorkRequestError } from "@/lib/work-request";
import { BackButton } from "@/components/casing/BackButton";
import { SourcingEventView } from "@/components/hire/SourcingEventView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sourcing Event · Panameer" };

// SE-E005: the buyer's Sourcing Event — header, proposals, Compare, Award.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("canHireTalent");
  const { id } = await params;
  const ev = await eventForBuyer(viewer, id).catch((e) => { if (e instanceof WorkRequestError) return null; throw e; });
  if (!ev) notFound();
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <div className="mt-2"><BackButton fallback={`/work-requests/${ev.jobId}`} label="Back to the Job" /></div>
      <SourcingEventView ev={ev} />
    </div>
  );
}
