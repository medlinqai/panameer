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

  /*
    ── ⚠⚠⚠ THE MONEY DOORS (`P2-ALL-E688` WS-A). **THEY GO IN BEFORE THE MENU
       ROWS COME OUT, AND THAT ORDER IS THE WHOLE POINT (rule 5).** ─────────────

    ⚠ Ruling `89e`, Scott 2026-09-27: *"roll it up into orders. NOTHING gets paid
    without an Order."* So `Get Paid` (`/payments`) leaves `PROVIDER_NAV` and
    `Pay` (`/pay`) leaves `REQUESTER_NAV`.

    ⚠⚠⚠ **MEASURED BEFORE A LINE WAS WRITTEN, AND IT IS WHY THIS COMMIT EXISTS
    ON ITS OWN: THE MENU ROW WAS THE ONLY UNCONDITIONAL DOOR TO EITHER ROUTE.**
    A comment-stripped sweep of `src/` found, for `/payments`, exactly one
    unconditional entrance — the rail entry — and for `/pay` the same. Everything
    else is CONDITIONAL and therefore not a door: `attention.ts` surfaces
    `/payments` only when something needs attention, `notification-events.ts`
    only if a notification fires, and the settlement components only once you are
    already inside a settlement. ⚠⚠ **AND FROM THIS PAGE THERE WAS NOTHING AT
    ALL** — zero `/payments` strings under `src/app/(app)/orders/`, and no
    `PAGE_TABS["/orders"]` key to hang a tab on. **Deleting the rows first would
    have orphaned both destinations**, the same defect that caught `Settings` and
    `Company` earlier the same day (`E687`).

    ── ⚠⚠ WHY THE CAPABILITY GATE IS REQUIRED HERE AND NOT DECORATION ─────────

    ⚠⚠⚠ **`/pay` IS GATED `canHireTalent` (`route-access.ts:226`), SO OFFERING
    IT TO A SELLER WOULD BE A DOOR ONTO A WALL** — `E579`'s exact shape, a
    control whose handler refuses. `/payments` is gated `authenticated`, so it
    would not refuse anyone; ⚠ it is still gated on `canProvideServices` because
    *"Get Paid"* is a false promise to somebody who sells nothing.
    ⚠ **The check goes through `access.ts`'s own helpers, never an inline role
    test** (load-bearing rule 5).

    ⚠⚠ **SOMEBODY WHO IS BOTH SEES BOTH DOORS, and that is this page's own
    doctrine rather than a new one** — see the docblock above: *"somebody who is
    both sees both, which is a real case on a marketplace where a consultancy
    buys and sells."*
    ⚠⚠⚠ **THE SIDE CANNOT BE DERIVED FROM THE ORDER ROWS AND THAT IS THE TRAP.**
    `listOrders` derives a party PER ROW, so a member with **no orders yet** has
    no row to derive a side from — and a member with no orders is precisely the
    one who needs to find where the money surface went. **The capability is the
    only thing that answers this at zero.**

    ── ⚠ WHAT THIS IS NOT ────────────────────────────────────────────────────

    ⚠⚠ **IT IS A DOOR, NOT A SECOND PAYMENTS SURFACE.** No payments view is
    rebuilt here; nothing about money is computed, read or rendered on this page.
    ⚠ Rolling the two pages together is its own decision — Scott: *"I am just not
    there yet."*
    ⚠⚠ **VISIBLE WITHOUT A HOVER, because there is no hover on touch** (88a), and
    rendered ABOVE the list so it does not disappear at zero orders.
    ⚠ **IT KEEPS THE WORD THE MEMBER LOST** — a seller who used `Get Paid` reads
    `Get Paid` here. ⚠ `88b`'s one-word rule governs TABS; these are links.
  */
  const sells = canProvideServices(viewer);
  const buys = canHireTalent(viewer);

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

      {(sells || buys) && (
        <nav
          aria-label="Payments"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          {sells && (
            <Link
              href="/payments"
              className="inline-flex min-h-11 items-center rounded-brand border border-line bg-white px-4 text-[14.5px] font-semibold hover:border-magenta hover:text-magenta"
            >
              Get Paid
            </Link>
          )}
          {buys && (
            <Link
              href="/pay"
              className="inline-flex min-h-11 items-center rounded-brand border border-line bg-white px-4 text-[14.5px] font-semibold hover:border-magenta hover:text-magenta"
            >
              Pay
            </Link>
          )}
        </nav>
      )}

      {orders.length === 0 ? (
        <div className="mt-8 rounded-brand border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[16px] font-bold">Nothing here yet</p>
          {/*
            ⚠ THE EMPTY STATE TELLS BOTH TRUTHS, because both rails land here and
            the two sides arrive for different reasons. It also names the DIRECT
            route in, since that is the half a reader would not guess.
          */}
          {/*
            ── ⚠⚠⚠ IT PROMISED TWO ROUTES THAT DO NOT EXIST (`E603` correction) ──

            ⚠⚠⚠ CORRECTED 2026-09-25 — **THIS MEASUREMENT IS NOW FALSE, AND
            LEAVING IT WOULD BE WORSE THAN THE COPY IT REPLACED.** `P2-A8-E621`
            WS-D built `lib/work-orders.ts`, so `workOrder.create` EXISTS, both
            routes fire, and `ISSUED`/`ACCEPTED`/`RELEASED` are all reachable —
            `check:work-orders` walks them. ⚠ The empty state below is still
            CORRECT, because `WorkOrder` holds no rows a member has made yet;
            what changed is that it is now empty rather than impossible.
            ⚠⚠ **WHOEVER REWRITES THIS COPY: the two routes it once promised are
            real now, so naming them is no longer a promise of a mechanism that
            does not exist.** Brief 7 WS-A owns that rewrite.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — true when written:
            //   ⚠ MEASURED 2026-09-23: **there is no `workOrder.create` anywhere in
            //   the repository.** Not in `src/`, not in `scripts/`, not in `prisma/`.
            //   `orders.ts` can only `updateMany` an order that nothing ever built,
            //   so `ISSUED` is never written and even the ACCEPT and RELEASE paths
            //   are unreachable code.
            //   ⚠⚠ SO NEITHER PROMISED ROUTE CAN FIRE. A work request cannot be
            //   "awarded" into an order, and nothing can "bring in" a direct one.
            ⚠⚠⚠ THIS IS THE SAME SHAPE AS THE TWO TILES `E603` RETIRED —
            *"once you complete your first paid work order"* and *"once buyers
            rate completed work orders."* **A page may not promise a mechanism
            that does not exist**, and the sentence must not imply the member is
            the one who has not done the thing.
            ⚠ WHAT REPLACES IT SAYS WHAT A WORK ORDER **IS** — which is true and
            useful — and then names the truncation plainly, with no next step
            invented for the reader.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   A work order is the SOW — what is to be done, for how long, and for how
            //   much. One appears here when a work request is awarded, or when an order
            //   agreed elsewhere is brought in as a direct work order.
          */}
          {/*
            ⚠⚠⚠ THE SECOND SENTENCE WAS FALSE AS OF `E621`. ⚠ It said *"Nothing
            creates one yet, so this list stays empty for everyone"* — and
            `lib/work-orders.ts` now creates one by BOTH routes, so the page was
            telling a member the machine is missing while the machine runs.
            ⚠⚠ **A page that under-claims is not "safely conservative" — it is
            wrong, and it sends somebody away from a thing that works.**
            ⚠ What replaces it names the two ways in, which is what a member
            actually needs and what the earlier `E603` copy was reaching for.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   A work order is the SOW — what is to be done, for how long, and
            //   for how much. Nothing creates one yet, so this list stays empty for
            //   everyone.
          */}
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
