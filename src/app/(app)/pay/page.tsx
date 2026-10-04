import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents } from "@/lib/display";
import { SettlementRowCard } from "@/components/settle/SettlementRows";
import { listSettlements } from "@/lib/settlements";

export const metadata = { title: "Payments · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fpay");

  const all = await listSettlements(viewer);
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
