import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { canHireTalent, canProvideServices } from "@/lib/access";
import { formatCents } from "@/lib/display";
import { listOrders, type OrderRow } from "@/lib/orders";
import { OriginBadge, StatusPill } from "@/components/orders/OrderChrome";

export const metadata = { title: "Work Orders · Panameer" };

function periodOf(o: OrderRow): string {
  if (o.periodStart && o.periodEnd) return `${o.periodStart} → ${o.periodEnd}`;
  if (o.periodStart) return `From ${o.periodStart}`;
  if (o.periodEnd) return `Until ${o.periodEnd}`;
  return "No period set";
}

export default async function Page() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Forders");

  const orders = await listOrders(viewer);
  const asBuyer = orders.filter((o) => o.party === "BUYER").length;
  const asProvider = orders.filter((o) => o.party === "PROVIDER").length;

  // THE MONEY DOORS WS-A). THEY GO IN BEFORE THE MENU
  const sells = canProvideServices(viewer);
  const buys = canHireTalent(viewer);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">Work Orders</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        {orders.length === 0
          ? "No work orders yet."
          : /* THE SPLIT IS NAMED ONLY WHEN THERE IS ONE. A person who is only a */
            [
              `${orders.length} order${orders.length === 1 ? "" : "s"}`,
              asBuyer > 0 && asProvider > 0 ? `${asBuyer} placed · ${asProvider} received` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
      </p>

      {(sells || buys) && (
        <nav
          aria-label="Payments"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {sells && (
            <Link
              href="/payments"
              className="inline-flex min-h-11 items-center border border-line bg-white px-4 text-[14.5px] font-semibold hover:border-magenta hover:text-magenta"
            >
              Get Paid
            </Link>
          )}
          {buys && (
            <Link
              href="/pay"
              className="inline-flex min-h-11 items-center border border-line bg-white px-4 text-[14.5px] font-semibold hover:border-magenta hover:text-magenta"
            >
              Pay
            </Link>
          )}
        </nav>
      )}

      {orders.length === 0 ? (
        <div className="mt-8 rounded-brand border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[16px] font-bold">Nothing here yet</p>
          {/* THE EMPTY STATE TELLS BOTH TRUTHS, because both rails land here and */}
          {/* IT PROMISED TWO ROUTES THAT DO NOT EXIST ( correction) */}
          {/* THE SECOND SENTENCE WAS FALSE AS OF . It said *"Nothing */}
          <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
            A work order is the SOW &mdash; what is to be done, for how long, and
            for how much. One arrives here when a buyer hires you, or when a
            purchase order is brought in from their own system.
          </p>
        </div>
      ) : (
        <ul className="mt-7 grid gap-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-brand border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-mono text-[15px] font-bold hover:text-magenta"
                    >
                      {o.orderNumber}
                    </Link>
                    <OriginBadge origin={o.origin} />
                  </div>
                  <p className="mt-1 text-[14.5px]">
                    {/* THE ROW NAMES THE OTHER SIDE AND SAYS WHICH SIDE THAT IS. */}
                    <span className="text-ink-2">
                      {o.party === "BUYER" ? "Provider: " : "Buyer: "}
                    </span>
                    <span className="font-semibold">{o.counterpartyName}</span>
                  </p>
                  <p className="mt-1 text-[13.5px] text-ink-2">
                    {periodOf(o)} · {o.lineCount} line{o.lineCount === 1 ? "" : "s"}
                    {/* A DIRECT ORDER HAS NO WORK REQUEST BEHIND IT AND THE ROW */}
                    {o.workRequestId ? (
                      <>
                        {" · "}
                        <Link
                          href={`/work-requests/${o.workRequestId}`}
                          className="underline underline-offset-2 hover:text-magenta"
                        >
                          from a work request
                        </Link>
                      </>
                    ) : o.externalRef ? (
                      <> · buyer&apos;s ref {o.externalRef}</>
                    ) : null}
                  </p>
                </div>
                <div className="text-right">
                  <StatusPill status={o.status} waiting={o.waiting} />
                  <p className="mt-1.5 text-[15px] font-bold">
                    {formatCents(o.valueCents, o.currency)}
                  </p>
                  <p className="text-[13px] text-ink-2">
                    {formatCents(o.drawnCents, o.currency)} drawn
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
