import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { formatCents } from "@/lib/display";
import { listOrders, type OrderRow } from "@/lib/orders";
import { OriginBadge, StatusPill } from "@/components/orders/OrderChrome";

/**
 * `/orders` — WORK ORDERS, BOTH SIDES, ONE PAGE (`P1-J4-E393` WS-1).
 *
 * ⚠⚠ THIS REPLACES A `ComingSoon` STUB THAT `E380` RENAMED AND DID NOT BUILD.
 * Its own docblock said so: *"AND IT IS STILL A STUB AFTER `E380`. Renaming it is
 * not implementing it."*
 *
 * ── ⚠⚠ ONE PAGE, TWO SCOPES, RESOLVED FROM THE VIEWER ───────────────────────
 *
 * A buyer sees orders they placed; a provider sees orders naming them; **and
 * somebody who is both sees both**, which is a real case on a marketplace where
 * a consultancy buys and sells. `listOrders` asks *"which orders is this PERSON
 * a party to?"* in one query and derives the side per row.
 *
 * ⚠ TWO ROUTES WOULD HAVE BEEN WORSE, NOT JUST DIFFERENT. `/orders/placed` and
 * `/orders/received` force a person to know which hat they are wearing before
 * clicking, and the rail has ONE `Orders` slot on both sides — `nav.ts` points
 * both `REQUESTER_NAV` and `PROVIDER_NAV` at this same href.
 *
 * ⚠ THE HEADING IS "Work Orders", the rail's word is "Orders" — `E378`'s rule,
 * and `nav.ts` records why the label is a plural NOUN: Scott's draft read
 * `Order | Settle`, and *"as a bare verb `Order` reads as a command (order
 * something) rather than as a place."*
 *
 * ⚠ GATED `authenticated`, WHICH IT ALREADY WAS. Both rails offer it, so a
 * capability gate on either side would refuse the other — the exact
 * offered-then-refused class `check:nav-reachable` exists for.
 */
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

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">Work Orders</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        {orders.length === 0
          ? "No work orders yet."
          : /* ⚠ THE SPLIT IS NAMED ONLY WHEN THERE IS ONE. A person who is only a
               buyer should not be told they have "0 as a provider" — that is a
               fact about the product, not about them. */
            [
              `${orders.length} order${orders.length === 1 ? "" : "s"}`,
              asBuyer > 0 && asProvider > 0 ? `${asBuyer} placed · ${asProvider} received` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
      </p>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-brand border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[16px] font-bold">Nothing here yet</p>
          {/*
            ⚠ THE EMPTY STATE TELLS BOTH TRUTHS, because both rails land here and
            the two sides arrive for different reasons. It also names the DIRECT
            route in, since that is the half a reader would not guess.
          */}
          <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed text-ink-2">
            A work order is the SOW — what is to be done, for how long, and for how
            much. One appears here when a work request is awarded, or when an order
            agreed elsewhere is brought in as a direct work order.
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
                    {/* ⚠ THE ROW NAMES THE OTHER SIDE AND SAYS WHICH SIDE THAT IS.
                        "Acme Ltd" alone is ambiguous when one page shows both. */}
                    <span className="text-ink-2">
                      {o.party === "BUYER" ? "Provider: " : "Buyer: "}
                    </span>
                    <span className="font-semibold">{o.counterpartyName}</span>
                  </p>
                  <p className="mt-1 text-[13.5px] text-ink-2">
                    {periodOf(o)} · {o.lineCount} line{o.lineCount === 1 ? "" : "s"}
                    {/*
                      ⚠⚠ A DIRECT ORDER HAS NO WORK REQUEST BEHIND IT AND THE ROW
                      MUST NOT IMPLY ONE. So the back-link is rendered ONLY when
                      there is genuinely one to render, and a direct order shows
                      its external reference instead — which is the only origin it
                      has, and it lives outside Panameer.
                    */}
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
                  <StatusPill status={o.status} />
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
