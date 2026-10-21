import { notFound } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { estimateEventForBuyer } from "@/lib/estimate-events";
import { BackButton } from "@/components/casing/BackButton";
import { EstimateEventView } from "@/components/shop/EstimateEventView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estimate Event · Panameer" };

// ES-E004: the buyer's Estimate Event page (same layout idea as the Proposals Sourcing Event page).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await guardPage("authenticated");
  const { id } = await params;
  const ev = await estimateEventForBuyer(viewer, id);
  if (!ev) notFound();
  return (
    <div className="pm-white-page mx-auto w-full max-w-5xl">
      <div className="mt-2"><BackButton fallback="/shop?tab=estimates" label="Back to Estimates" /></div>
      <EstimateEventView ev={ev} />
    </div>
  );
}
