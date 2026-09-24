import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

/**
 * ── ⚠⚠ PROFILE VIEWS — THE WRITE PATH AND THE READ (`P0-E595` A2 / WS-C) ───
 *
 * ⚠⚠⚠ `model ProfileView` SHIPPED IN WS-A WITH NO CODE ON EITHER SIDE OF IT.
 * WS-A was schema-only by instruction — *"Add columns; backfill nothing"* — so
 * the table has existed since `ca856a8` while `grep` for `ProfileView` in
 * `src/` returned nothing but a same-named component. ⚠ This module is the
 * write path and the read the brief asked for, and it is the only place either
 * happens.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — what `ConnectProfile` said while
 * the figure had nothing behind it:
 * //   ⚠⚠⚠ `Viewing Me` HAS NO DATA AND IS NOT INVENTED. There is NO view
 * //   tracking anywhere in this codebase — no `view_count`, no `ProfileView`
 * //   model, nothing writes one. ⚠ The mockup shows `201`; that number does
 * //   not exist and a plausible one would be a fabricated fact about a real
 * //   person's profile.
 *
 * ── ⚠⚠ THE THREE RULES, AND THEY ARE THE BRIEF'S, NOT MINE ────────────────
 *
 * 1 ⚠⚠⚠ **A VIEW IS NOT AN IMPRESSION — ONE PER VIEWER PER DAY.** The window is
 *   the CALENDAR DAY, and it is enforced by the database, not by this code:
 *   `@@unique([profile_id, viewer_person_id, viewed_on])` with `viewed_on` a
 *   `@db.Date`. ⚠ A refresh, a back-button, or Next re-rendering the same
 *   Server Component twice all collapse to the row that is already there.
 *   ⚠⚠ THE CONSTRAINT IS WHY THIS IS SAFE TO CALL DURING RENDER: the operation
 *   is idempotent by construction, so "how many times did React run this" stops
 *   being a question anybody has to answer.
 * 2 ⚠ **NEVER COUNT THE OWNER VIEWING THEMSELVES.** People check their own
 *   profile constantly. The caller passes `isOwner` and this refuses.
 * 3 ⚠⚠ **STORE WHO, SHOW THE COUNT.** `viewer_person_id` is recorded on every
 *   row although nothing displays it — *"attribution cannot be retrofitted to
 *   views already recorded"*, the argument `E493` used for
 *   `ColleagueInvite.inviter_person_id`. ⚠⚠⚠ SHOWING *WHO* IS NAMED OUT OF
 *   SCOPE IN THE BRIEF and is likely a paid tier. Do not add it here.
 */

/**
 * ⚠ THE DAY IS THE SERVER'S CALENDAR DAY, AS A `Date` AT UTC MIDNIGHT.
 *
 * ⚠⚠ `viewed_on` IS `@db.Date`, SO THE TIME PART IS DISCARDED BY POSTGRES — but
 * it is normalised here anyway so the value this code compares, caches and
 * sends is the same one the column stores. ⚠ A timestamp truncated in code on
 * one machine and not another is how a "unique per day" constraint quietly
 * becomes "unique per day per timezone".
 */
function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Record that `viewerUserId` looked at `profileId` today. Idempotent.
 *
 * ⚠ It never throws into the page. A profile that cannot be counted is worth
 * less than a profile that will not render — the same rule `E522`'s receipt
 * follows, where *"a throw would turn a logging outage into a signup outage."*
 */
export async function recordProfileView(opts: {
  profileId: string;
  viewerUserId: string | null | undefined;
  isOwner: boolean;
}): Promise<void> {
  /* ⚠ RULE 2 — the owner's own visit is not a view. */
  if (opts.isOwner) return;
  if (!opts.viewerUserId) return;

  try {
    /* ⚠ `viewer_person_id` IS NOT NULL, so an account with no Person row cannot
       be recorded. That is correct rather than unfortunate: a view with no
       viewer is an impression, and rule 1 says we do not count those. */
    const person = await prisma.person.findFirst({
      where: { user_id: opts.viewerUserId },
      select: { id: true },
    });
    if (!person) return;

    /*
      ⚠⚠ `createMany` + `skipDuplicates` RATHER THAN `upsert`, DELIBERATELY.
      An upsert would issue an UPDATE on the second view of the day — touching
      `viewed_at` and rewriting a row to say nothing new. ⚠ This inserts once
      and then does nothing, which is what "counts once" means.
    */
    const written = await prisma.profileView.createMany({
      data: [{ profile_id: opts.profileId, viewer_person_id: person.id, viewed_on: today() }],
      skipDuplicates: true,
    });

    /*
      ── ⚠⚠⚠ THE OWNER HEARS ABOUT IT — ONCE (`P2-A3-E620`, ruling 34e) ─────

      ⚠⚠ `written.count === 0` MEANS THE VIEW WAS ALREADY RECORDED TODAY, so
      there is nothing new to tell anybody. ⚠⚠⚠ THIS IS THE IDEMPOTENCY, AND IT
      IS THE ROW ITSELF RATHER THAN A SECOND RULE: the notification fires
      exactly when a view is COUNTED, so the bell and the profile's number can
      never disagree about how many views there were (`E585`). A dedupe key
      alone would have been a second definition of "once".
      ⚠ RULE 2 ABOVE ALREADY RETURNED for the owner's own visit, so WS-B item 3
      — *"the owner is never told they viewed their own page"* — is satisfied
      before this line can run.

      ⚠⚠ IT IS `DIGEST`, NOT `FEED` (see the registry): the row is recorded and
      does NOT ring the bell. A bell that rings on every glance at your page is
      the fastest way to get muted, which is why `learn.lesson_completed` is
      already DIGEST. ⚠ The digest SENDER is deliberately unbuilt — rows
      accumulate, and that is the existing, documented behaviour, not new debt.
    */
    if (written.count > 0) {
      const owner = await prisma.providerProfile.findUnique({
        where: { id: opts.profileId },
        select: { person_id: true },
      });
      const viewer = await prisma.person.findUnique({
        where: { id: person.id },
        select: { first_name: true, last_name: true },
      });
      if (owner) {
        await notify({
          event: "profile.viewed",
          personId: owner.person_id,
          entityType: "provider_profile",
          entityId: opts.profileId,
          dedupeKey: `profile.viewed:${opts.profileId}:${person.id}:${today()}`,
          vars: {
            viewerName:
              [viewer?.first_name, viewer?.last_name].filter(Boolean).join(" ") || "Someone",
          },
        });
      }
    }
  } catch {
    /* ⚠ Swallowed on purpose — see the note above. */
  }
}

/**
 * How many views this profile has — one per viewer per day, all time.
 *
 * ⚠⚠ NO TIME WINDOW, AND THAT IS THE `Counters` DECISION APPLIED RATHER THAN A
 * SHRUG. Scott, LOCKED: *"a real count of what is in the database, seeded rows
 * included, or a number Scott specifies. Count it and print it."* ⚠ A trailing
 * 30- or 90-day window is a product choice nobody has made, and picking one
 * here would put a number on a real person's profile that no ruling supports.
 * ⚠ The rows carry `viewed_on`, so a window can be added later without
 * re-recording anything — which is the half that genuinely cannot be retrofitted.
 */
export async function countProfileViews(profileId: string): Promise<number> {
  return prisma.profileView.count({ where: { profile_id: profileId } });
}
