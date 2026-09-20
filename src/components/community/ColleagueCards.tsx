import Link from "next/link";
import { Face } from "@/components/community/Silhouette";
import { ConnectControls } from "@/components/community/ConnectControls";
import type { ColleagueCard, InvitedCard } from "@/lib/community-page";

/**
 * ── ⚠⚠ THE COLLEAGUE CARDS (`P2-J3-E591` WS-C items 3, 4, 5) ──────────────
 *
 * ⚠⚠⚠ TWO SHAPES, NOT ONE SHAPE DIMMED. A joined colleague has a profile; an
 * invited person has a name, an email and a date, and nothing else exists about
 * them. ⚠ Rendering the second as a faded version of the first would imply
 * fields that have no value — which is the recruiter-shell problem in miniature.
 *
 * ⚠⚠ NO RATE REACHES THIS FILE. `ColleagueCard` cannot carry one — see
 * `lib/community-page.ts`, where it is omitted from the QUERY rather than from
 * the render.
 */

/**
 * ⚠⚠ THE WHOLE CARD OPENS THEIR PROFILE (WS-C item 5) — VIA A STRETCHED LINK,
 * NOT A WRAPPING ANCHOR.
 *
 * ⚠⚠⚠ AN `<a>` INSIDE AN `<a>` IS INVALID HTML AND BREAKS KEYBOARD ORDER: the
 * browser closes the outer anchor early, the inner control lands outside it,
 * and tab order stops matching what the eye sees. ⚠ So the card is a `<div>`,
 * ONE anchor inside it is stretched across the card with `::after`, and
 * `Message` sits above it on the z-axis and stays its own control.
 * ⚠ The accessible name of the stretched link is the person's NAME, so a screen
 * reader hears *"Joe Flacco, link"* rather than *"card, link"*.
 */
export function JoinedCard({ c }: { c: ColleagueCard }) {
  return (
    <div className="pm-cm-card">
      <Face photoUrl={c.photoUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="pm-cm-name">
          {c.profileId ? (
            /* ⚠ Unlinked when they have no provider profile — a link to a 404
               is worse than a name that is not a link. */
            <Link href={`/providers/${c.profileId}`} className="pm-cm-open">
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </p>

        {/* ⚠⚠ THEIR OWN TITLE, VERBATIM AND NEVER RE-CASED (`E568`, item 4).
            A title is DATA. ⚠ Absent means absent — no placeholder, ever. */}
        {c.title && <p className="pm-cm-title">{c.title}</p>}
        {c.company && <p className="pm-cm-where">{c.company}</p>}
        {c.location && <p className="pm-cm-where">{c.location}</p>}

        <div className="pm-cm-actions mt-2">
          <ConnectControls toUserId={c.userId} relation="ACCEPTED" />
        </div>
      </div>
    </div>
  );
}

/**
 * ── ⚠⚠ AN INVITED PERSON'S CARD: NAME, EMAIL, WHEN IT WAS SENT ────────────
 *
 * ⚠⚠⚠ AND NOTHING ELSE (WS-C item 4). No title, no location, no photo.
 * ⚠ **NEVER A PLACEHOLDER TITLE** — Scott, 2026-09-20: *"Invites will ONLY have
 * the information we provide (name and email). they will have no title."* A
 * fabricated title on a person who has not joined is a record of somebody who
 * does not exist yet.
 *
 * ⚠⚠ THE CARD DOES NOT OPEN ANYTHING, because there is no profile to open. It
 * is not an anchor and carries no `pm-cm-open`, so it cannot be tabbed to as a
 * link and cannot look like one.
 *
 * ⚠ THE FACE IS THE GREY SILHOUETTE, NOT INITIALS — and it is here precisely
 * BECAUSE they have no photo: the glyph says *"no photo yet"* where initials
 * would manufacture a monogram for somebody who has never signed in.
 */
export function InvitedCardView({ i }: { i: InvitedCard }) {
  return (
    <div className="pm-cm-card pm-cm-card-invited">
      <Face photoUrl={null} size={44} />
      <div className="min-w-0 flex-1">
        {/* ⚠ The name may be null — the invite holds it only if it was typed.
            Then the EMAIL is the identity, and it is not repeated below. */}
        <p className="pm-cm-name">{i.name ?? i.email}</p>
        {i.name && <p className="pm-cm-email">{i.email}</p>}
        <p className="pm-cm-sent">Invited {sentLabel(i.sentAt)}</p>

        <div className="pm-cm-actions mt-2 flex gap-2">
          {/* ⚠⚠ `Nudge` AND `Resend` ARE THE TWO ACTIONS THE BRIEF NAMES, and
              they are rendered DISABLED because neither endpoint exists.
              ⚠⚠⚠ A CONTROL THAT LOOKS LIVE AND DOES NOTHING IS WORSE THAN NO
              CONTROL — `E560` and `E493` are both records of a door that led
              nowhere. ⚠ `title` says why, so the state is explained rather than
              merely applied. Wiring them is its own brief. */}
          <button
            type="button"
            disabled
            title="Nudging an invitation isn't built yet."
            className="rounded-brand border border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink-3"
          >
            Nudge
          </button>
          <button
            type="button"
            disabled
            title="Resending an invitation isn't built yet."
            className="rounded-brand border border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink-3"
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ── ⚠⚠⚠ "WAITING ON YOU" — THE ONE BLOCK THAT IS A DEBT, NOT AN INVITATION ─
 *
 * ⚠⚠ THIS NEARLY SHIPPED MISSING, AND `check:connect-walk` CAUGHT IT. The WS-C
 * layout replaced `ConnectHome`, whose first block was this one — and with it
 * gone, **an incoming colleague request had no door anywhere in the app.**
 * `/community/colleagues` renders the roster, not the pending requests, so a
 * member could not accept or decline at all.
 *
 * ⚠⚠⚠ THAT IS A WALL, NOT A COSMETIC LOSS, and it is precisely the defect
 * `connect-walk.spec.ts` already records in its own words: *"Removing a tab
 * without proving the replacement exists is exactly how `E493`'s invite and
 * `E519`'s résumé re-run got buried."*
 *
 * ⚠ FIRST IN THE COLUMN, ABOVE THE WEB, because it is the only place somebody
 * else is blocked on this member. Everything below it is discovery.
 * ⚠ It renders NOTHING at zero — no empty box, no "0 requests".
 */
export function WaitingOnYou({
  rows,
}: {
  rows: { connectionId: string; userId: string; name: string; title: string | null; photoUrl: string | null }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-[17px] font-bold">Waiting on You</h2>
      <div className="pm-cm-cards">
        {rows.map((r) => (
          <div key={r.connectionId} className="pm-cm-card">
            <Face photoUrl={r.photoUrl} size={44} />
            <div className="min-w-0 flex-1">
              <p className="pm-cm-name">{r.name}</p>
              {r.title && <p className="pm-cm-title">{r.title}</p>}
              <div className="pm-cm-actions mt-2">
                {/* ⚠ `showDecline` — `Decline` IS A REAL BUTTON (`E374`), not a
                    hidden menu item. Nothing is destroyed: the connection row is
                    UPDATED, never deleted. */}
                <ConnectControls
                  toUserId={r.userId}
                  relation="PENDING"
                  incomingConnectionId={r.connectionId}
                  showDecline
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * ⚠ A relative day count, computed on the SERVER from a real column.
 * ⚠⚠ NO `toLocaleDateString()` HERE — the server's locale and the reader's can
 * differ, and a date that changes between the HTML and the hydrated render is a
 * hydration mismatch. Days are the same integer everywhere.
 */
function sentLabel(sentAt: Date): string {
  const days = Math.floor((Date.now() - sentAt.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}
