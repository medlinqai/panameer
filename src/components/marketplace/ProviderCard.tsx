import Link from "next/link";
import type { TeaserProvider } from "@/lib/explore";

/**
 * THE MARKETPLACE TALENT CARD — one component, two callers (home teaser and
 * `/explore`). Rebuilt to the WS-2 spec in brief_home_polish_v2_2026-08-13.
 *
 * ── IT IS A TEASER. THE PROFILE IS THE ACTION HUB ────────────────────────────
 *
 * Every field here is chosen to earn a click, not to substitute for the
 * profile: photo, first name, location, one derived title, three quantified
 * proofs, three tags, rate. Full bio, every skill, every employer, degrees and
 * packages live on the profile, and the name is the door to it.
 *
 * ── THE SCHEMA IS FIXED SO CARDS CANNOT BE GAMED ─────────────────────────────
 *
 * Same fields for everyone, and the ones that matter are computed rather than
 * typed. The title comes from the catalog specialty, not free text; the
 * employer and project counts are `_count`s; "Validated" is a status. The only
 * provider-chosen inputs are which specialty, which school, and which skills —
 * so a card cannot be made louder by writing more.
 *
 * ── WHAT THE SCHEMA CANNOT DO YET, STATED PLAINLY ────────────────────────────
 *
 * The brief asks for "top 3 skill tags, provider-PINNED, from VALIDATED skills
 * only". Neither half exists in the data model: `ProviderSkill` has no `pinned`
 * column and no per-skill validation — validation is a status on the PROFILE
 * (`validation_status`). Two things follow, and both are deliberate:
 *
 *   1. Tags render only for a VALIDATED profile. That is the strongest form of
 *      "not vanity tags" the schema supports, and it is the honest reading of
 *      the rule rather than the convenient one.
 *   2. No `pinned` column was invented for it. A boolean nothing writes would
 *      make every card tagless and look like the feature shipped.
 *
 * ⚠ CONSEQUENCE ON THE WALK: 0 of the 23 marketplace-visible providers are
 * VALIDATED today (all `NOT_REQUESTED`), so `/explore` cards show NO tags. That
 * is the data being honest, not the card being broken. The home teaser's sample
 * is validated, so the design is visible there.
 *
 * ── THE NAME LINKS OUT; THE MASKING SURVIVES ─────────────────────────────────
 *
 * `TeaserProvider` still has no surname field at all (see lib/explore.ts), so
 * the card cannot leak one however it is edited. `/providers/[id]` — which does
 * render the surname — was a public route when this card was written, which is
 * why E032 forbade deep-linking to it. `brief_fix_pages_four_navs` gated it
 * (307 -> /login logged out), so the name can be a link now; public callers
 * point it through the gate with a callback so the click survives sign-in.
 */
export function ProviderCard({
  p,
  loginHref,
  profileHref,
}: {
  p: TeaserProvider;
  /** Where "Book a consultation" goes — the direct-book shortcut. */
  loginHref: string;
  /**
   * Where the NAME goes. Caller-supplied because only the caller knows whether
   * the viewer is gated: public surfaces pass /login with a callback to
   * /providers/[id]; a sample card passes somewhere real instead of a profile
   * that does not exist.
   */
  profileHref: string;
}) {
  /*
    Both counts zero => brand new. Shown as a state, never as "0 Projects":
    a zero is a real number and this one would be read as a verdict on the
    person rather than as "hasn't filled this in yet". The projects count is
    meant to be a nudge to add projects, and a nudge that reads as a score is
    a deterrent.
  */
  const isNew = p.employerCount === 0 && p.projectCount === 0;

  return (
    <article className="flex flex-col rounded-brand border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand">
      <div className="flex items-center gap-3">
        {p.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.photoUrl}
            alt={`${p.firstName}, Panameer provider`}
            width={52}
            height={52}
            className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-bg-soft text-[18px] font-bold text-ink-2"
          >
            {p.firstName.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          {/*
            THE NAME IS THE DOOR. It is the element people click on a card, and
            it went nowhere — the only link was the CTA. `hover:text-magenta`
            plus `underline-offset` on hover so it reads as a link without
            being underlined at rest in a dense grid.
          */}
          <Link
            href={profileHref}
            className="block truncate text-[16px] font-bold text-ink transition-colors hover:text-magenta hover:underline hover:underline-offset-2"
          >
            {p.firstName}
          </Link>
          {p.location && (
            <p className="truncate text-[13px] text-ink-2">{p.location}</p>
          )}
        </div>
        {p.validated && (
          <p className="ml-auto shrink-0 self-start text-[12.5px] font-bold text-magenta">
            ✓ Validated
          </p>
        )}
      </div>

      {/*
        ONE LINE, ellipsis — `truncate`, not `line-clamp-2`. The spec says
        single-line, and it is what makes a ragged row of cards line up: with
        two-line clamping the pedigree strip below started at a different
        height on every card.
      */}
      <p
        title={p.title}
        className="mt-3.5 truncate text-[14.5px] font-semibold leading-snug text-ink"
      >
        {p.title}
      </p>

      {/*
        THE PEDIGREE STRIP — three quantified proofs, one row. Fixed fields,
        all computed. `flex-wrap` because "Glasgow Caledonian University" plus
        two counts does not fit a 380px card on one line, and truncating a
        school name to "Glasgow Caledoni…" is worse than a second row.
      */}
      {isNew ? (
        <p className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full bg-bg-soft px-2.5 py-1 text-[12px] font-semibold text-ink-2">
          <span aria-hidden className="text-magenta">
            ✦
          </span>
          New to Panameer
        </p>
      ) : (
        <ul className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
          {p.university && (
            <li className="flex min-w-0 items-center gap-1.5">
              <CapIcon />
              <span className="truncate">{p.university}</span>
            </li>
          )}
          {p.employerCount > 0 && (
            <li className="flex items-center gap-1.5">
              <BuildingIcon />
              {p.employerCount} {p.employerCount === 1 ? "Employer" : "Employers"}
            </li>
          )}
          {p.projectCount > 0 && (
            <li className="flex items-center gap-1.5">
              <FolderIcon />
              {p.projectCount} {p.projectCount === 1 ? "Project" : "Projects"}
            </li>
          )}
        </ul>
      )}

      {/* Validated profiles only — see the header note on what the schema lacks. */}
      {p.validated && p.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {p.skills.slice(0, 3).map((s) => (
            <li
              key={s}
              className="rounded-full bg-bg-soft px-2.5 py-1 text-[12px] text-ink-2"
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {/* `mt-auto` so the rate and CTA sit on one line across a ragged row. */}
      <div className="mt-auto pt-4">
        {p.rate && <p className="text-[15px] font-bold text-ink">{p.rate}</p>}
        {/*
          THE SHORTCUT, not the main path — outlined, not filled (pink is
          accents only, 2026-08-13). The main path is the name above: the
          profile is where someone decides. This is for the buyer who has
          already decided.
        */}
        <Link
          href={loginHref}
          className="mt-2.5 block rounded-full border-[1.5px] border-line px-4 py-2 text-center text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          Book a consultation
        </Link>
      </div>
    </article>
  );
}

/* 14px stroke glyphs. `aria-hidden` — the text beside each one says it. */
const ICON = "h-[14px] w-[14px] shrink-0 text-ink-2/70";

function CapIcon() {
  return (
    <svg aria-hidden className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 9 12 4 2 9l10 5 10-5Z" />
      <path d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg aria-hidden className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
