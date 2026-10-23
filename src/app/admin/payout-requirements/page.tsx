import { guardPage } from "@/lib/guard";
import { payoutRules } from "@/lib/payout-requirements";
import { PayoutRequirementsEditor } from "@/components/admin/PayoutRequirementsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payout Requirements · Admin · Panameer" };

// RV-E004: what a provider's company needs before Panameer pays it out, by country. Read only at payout.
export default async function Page() {
  await guardPage("canAdminister");
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-[28px] font-bold">Payout Requirements</h1>
      <p className="mb-5 mt-1 max-w-[70ch] text-[14px] text-ink-2">
        What a provider&apos;s company needs before its first payout, by country. Ordering, orders and payment requests never ask for these — only the payout does. Buyers never need a tax form.
      </p>
      <PayoutRequirementsEditor rules={await payoutRules()} />
    </div>
  );
}
