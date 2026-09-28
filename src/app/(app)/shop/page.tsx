import Link from "next/link";
import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";
import { canProvideServices } from "@/lib/access";

/**
 * Search Service Products — a titled placeholder the requester rail can land on (WS-A).
 *
 * The rail names this destination, so it has to exist: a 404 out of your own
 * navigation reads as a broken product, where a titled empty state reads as one
 * that has not got there yet — which is the truth. The route and its title are
 * real; only the content is pending.
 *
 * ── ⚠⚠⚠ SHOP IS SLOT 4 FOR EVERYONE NOW (`P2-ALL-E693`, ruling `89e` corrected)
 *
 * ⚠⚠ **SCOTT, 2026-09-27:** *"Slot 4 is Shop for everyone — Sell is gone, it
 * becomes a button inside Shop. Role-dependence is slot 3 only."*
 *
 * ⚠⚠⚠ **SO THE `canHireTalent` GATE HAD TO GO, AND THAT IS AN IMPLICATION OF
 * THE RULING RATHER THAN A DECISION OF MINE.** A slot shown to everyone that
 * points at a page refusing sellers is `E579`'s door onto a wall — and
 * `guardPage` refuses by **redirecting to `/dashboard?noaccess=1`**, so the
 * seller would be visibly bounced out of their own menu.
 * ⚠⚠ **AND NO GATE WOULD HAVE CAUGHT IT: `/packages` IS NOT IN
 * `route-access.ts` AT ALL**, so `check:nav-reachable` §1 reads it as public and
 * passes without checking. The only guard was this line, inside the page, where
 * the gate cannot see it. **Measured, not assumed.**
 * ⚠ Nothing is exposed by the widening — the page is a `ComingSoon` stub.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   await guardPage("canHireTalent");
 * //   "only the content is pending" applied to "The route, its title and its
 * //   capability gate are real".
 */
export const metadata = { title: "Search Service Products · Panameer" };

export default async function Page() {
  const viewer = await guardPage("authenticated");

  return (
    <div className="mx-auto w-full max-w-5xl">
      {/*
        ── ⚠⚠⚠ THE SELLER'S DOOR. **IT GOES IN BEFORE `Sell` LEAVES THE MENU.**

        ⚠ Ruling `89e` corrected: `Sell` stops being slot 4 and *"becomes a
        button inside Shop"*. ⚠⚠ **MEASURED FIRST: `/my-services` HAS EXACTLY ONE
        UNCONDITIONAL DOOR TODAY — the `Sell` rail entry.** Removing it without
        this button first would orphan an 89-line live page, which is the same
        rule-5 ordering `E688` proved with the money doors.

        ⚠⚠ **GATED ON `canProvideServices`, AND THAT IS REQUIRED, NOT
        DECORATION:** `/my-services` demands that capability, so offering the
        button to a buyer would be a second door onto a wall inside the page that
        exists to stop the first one. ⚠ Through `access.ts`'s own helper, never
        an inline role test (load-bearing rule 5).

        ⚠ **VISIBLE WITHOUT A HOVER** (88a), and above the placeholder rather
        than below it — a seller arriving at a `ComingSoon` must not have to
        scroll past "nothing here yet" to find the thing that is theirs.
      */}
      {canProvideServices(viewer) && (
        <nav aria-label="Selling" className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            href="/my-services"
            className="inline-flex min-h-11 items-center rounded-brand border border-line bg-white px-4 text-[14.5px] font-semibold hover:border-magenta hover:text-magenta"
          >
            Sell Your Services
          </Link>
        </nav>
      )}

      <ComingSoon title="Search Service Products" />
    </div>
  );
}
