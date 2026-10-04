import { getPlan } from "@/lib/plan/store";
import { publicPlan } from "@/lib/plan/public";
import { toEditorRow } from "@/lib/plan/editor-row";
import { PlanView } from "@/components/plan/PlanView";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { copyableOrders, woPlanKey } from "@/lib/wo-plan";
import { WoPlanStart } from "@/components/orders/WoPlanStart";
import { WoPlanEdit } from "@/components/orders/WoPlanEdit";

// Plan tab body: start-from options until a plan exists, then the shared timeline/grid view + Edit plan.
export async function WoPlanSection({ orderId, viewer, hoursAuthorized }: { orderId: string; viewer: Viewer; hoursAuthorized: number | null }) {
  const stored = await getPlan(woPlanKey(orderId));
  const rows = stored?.rows ?? [];
  if (rows.length === 0) {
    const me = await prisma.person.findFirst({ where: { user_id: viewer.userId }, select: { id: true } });
    return <WoPlanStart orderId={orderId} copyable={me ? await copyableOrders(me.id, orderId) : []} />;
  }
  const today = new Date();
  const planHours = rows.filter((r) => r.type === "task").reduce((n, r) => n + (r.hours ?? 0), 0);
  return (
    <div data-testid="wo-plan">
      {hoursAuthorized != null && planHours > hoursAuthorized && (
        <p data-testid="wo-plan-hours-warn" className="mt-5 border-l-2 border-magenta py-1 pl-3 text-[13.5px]">
          The plan adds up to {planHours} hours; this work order authorizes {hoursAuthorized}. The work order&apos;s hours stay the limit.
        </p>
      )}
      <PlanView plan={publicPlan(stored!.plan, rows, today)} today={today.toISOString().slice(0, 10)} forOrder />
      <WoPlanEdit orderId={orderId} rows={rows.map(toEditorRow)} />
    </div>
  );
}
