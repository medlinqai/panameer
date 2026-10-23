import { getPlan } from "@/lib/plan/store";
import { publicPlan } from "@/lib/plan/public";
import { toEditorRow } from "@/lib/plan/editor-row";
import { PlanView } from "@/components/plan/PlanView";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { chosenTe, copyableOrders, woPlanKey } from "@/lib/wo-plan";
import { formatCents } from "@/lib/display";
import { WoAddPlan } from "@/components/orders/WoAddPlan";
import { WoPlanStart } from "@/components/orders/WoPlanStart";
import { WoPlanEdit } from "@/components/orders/WoPlanEdit";

// Plan tab body: start-from options until a plan exists, then the shared timeline/grid view + Edit plan.
// WT-E004: framed as how the remaining amount is consumed — "Remaining $X of $Y · planned $Z"; timesheets live under Settlements.
export async function WoPlanSection({ orderId, viewer, hoursAuthorized, currency, remainingCents, valueCents, hourlyCents }: { orderId: string; viewer: Viewer; hoursAuthorized: number | null; currency: string; remainingCents?: number; valueCents?: number; hourlyCents?: number | null }) {
  const stored = await getPlan(woPlanKey(orderId));
  const rows = stored?.rows ?? [];
  if (rows.length === 0) {
    const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
    const copyable = me ? await copyableOrders(me.id, orderId) : [];
    if (await chosenTe(orderId))
      return (
        <div data-testid="wo-te">
          <p className="mt-5 text-[14px] text-ink-2">Time and expenses only — timesheets are under Settlements. Add a plan to show how the remaining amount will be used.</p>
          <WoAddPlan orderId={orderId} copyable={copyable} />
        </div>
      );
    return <WoPlanStart orderId={orderId} copyable={copyable} />;
  }
  const today = new Date();
  const planHours = rows.filter((r) => r.type === "task").reduce((n, r) => n + (r.hours ?? 0), 0);
  const plannedCents = hourlyCents ? planHours * hourlyCents : null;
  return (
    <div data-testid="wo-plan">
      {remainingCents != null && valueCents != null && (
        <p data-plan-money className="mt-5 text-[14.5px]">
          <b>Remaining {formatCents(remainingCents, currency)}</b> of {formatCents(valueCents, currency)} · planned {plannedCents != null ? formatCents(plannedCents, currency) : `${planHours} hours`}
          {plannedCents != null && plannedCents > remainingCents && <span className="ml-2 font-semibold text-magenta-dark">more than remains</span>}
        </p>
      )}
      {hoursAuthorized != null && planHours > hoursAuthorized && (
        <p data-testid="wo-plan-hours-warn" className="mt-5 border-l-2 border-magenta py-1 pl-3 text-[13.5px]">
          The plan adds up to {planHours} hours; this order authorizes {hoursAuthorized}. The order&apos;s hours stay the limit.
        </p>
      )}
      <PlanView plan={publicPlan(stored!.plan, rows, today)} today={today.toISOString().slice(0, 10)} forOrder />
      <WoPlanEdit orderId={orderId} rows={rows.map(toEditorRow)} />
    </div>
  );
}
