import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents } from "@/lib/display";
import { SettlementRowCard } from "@/components/settle/SettlementRows";
import { listSettlements } from "@/lib/settlements";

/**
 * `/pay` — THE BUYER'S APPROVAL QUEUE (`P1-J4-E394` WS-3).
 *
 * ⚠⚠ THIS REPLACES A `ComingSoon` STUB. `nav.ts` records the label decision:
 * `Payments` is *"the second plural noun, same decision"* as `Orders` — Scott's
 * draft read `Settle`, *"the one label nobody arrives already understanding, in
 * the ONE SECTION WHERE MONEY LIVES."* The href is `/pay` on the buyer's side and
 * `/finances` on the provider's — mirrored routes.
 *
 * ⚠ WHAT IS AWAITING THEM COMES FIRST, and the rest is history. A queue that
 * sorts by date puts the thing needing a decision below three that are already
 * paid.
 *
 * ⚠ NOT IN THIS BRIEF, AND FLAGGED RATHER THAN STUBBED: payment allocation,
 * payouts and the matching workbench. ⚠⚠ THE UNMATCHED-PAYMENT QUEUE IS A REAL
 * SCREEN SOMEBODY MUST OWN — `E388` built `Payment`, `PaymentLine` and
 * `paymentStatusFor` (`UNMATCHED | PARTIALLY_ALLOCATED | ALLOCATED`), and there
 * is nowhere to see an UNMATCHED one. Reported, not built.
 */
export const metadata = { title: "Payments · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fpay");

  const all = await listSettlements(viewer);
  /* ⚠ THE BUYER'S SIDE ONLY. `listSettlements` answers both scopes; this page is
     the buyer's queue, and a buyer who also sells reads their own requests on
     `/finances/payment-requests`. */
  const mine = all.filter((s) => s.party === "BUYER");
  const awaiting = mine.filter((s) => s.status === "SUBMITTED");
  const decided = mine.filter((s) => s.status !== "SUBMITTED");
  const awaitingCents = awaiting.reduce((n, s) => n + s.totalCents, 0);
  const currency = awaiting[0]?.currency ?? mine[0]?.currency ?? "USD";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">Payments</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        {mine.length === 0
          ? "No payment requests yet."
          : awaiting.length > 0
            ? `${awaiting.length} awaiting your approval · ${formatCents(awaitingCents, currency)}`
            : `${mine.length} payment request${mine.length === 1 ? "" : "s"}, all decided`}
      </p>

      {mine.length === 0 ? (
        <div className="mt-8 rounded-brand border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[16px] font-bold">Nothing to approve</p>
          <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
            When a provider claims time or a fixed amount against one of your
            released work orders, it appears here for you to approve or send back.
          </p>
        </div>
      ) : (
        <>
          {awaiting.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-[20px] font-bold tracking-[-0.3px]">
                Awaiting your approval
              </h2>
              <ul className="mt-4 grid gap-3">
                {awaiting.map((s) => (
                  <SettlementRowCard key={s.id} row={s} />
                ))}
              </ul>
            </>
          )}
          {decided.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-[20px] font-bold tracking-[-0.3px]">
                Decided
              </h2>
              <ul className="mt-4 grid gap-3">
                {decided.map((s) => (
                  <SettlementRowCard key={s.id} row={s} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
