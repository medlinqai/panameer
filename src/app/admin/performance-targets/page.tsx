import { targetRows } from "@/lib/dashboard/targets";
import { GROUP_MIN } from "@/lib/dashboard/progress";
import { TargetsTable } from "./TargetsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Performance Targets · Admin · Panameer" };

// MD-E005: Admin › Performance Targets (the admin layout guards canAdminister).
export default async function Page() {
  const [seller, buyer] = await Promise.all([targetRows("SELLER"), targetRows("BUYER")]);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-[28px] font-bold">Performance Targets</h1>
      <p className="mt-1 text-[14px] text-ink-2">These are <b>Targets</b>, shown as the magenta marker on My Progress (labelled &quot;Target&quot;) while a group has fewer than {GROUP_MIN} people. At {GROUP_MIN}+ the marker switches to the real group average.</p>
      <TargetsTable role="SELLER" title="Seller Targets" initial={seller} />
      <TargetsTable role="BUYER" title="Buyer Targets" initial={buyer} />
    </div>
  );
}
