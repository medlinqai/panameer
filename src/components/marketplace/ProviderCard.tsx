import Link from "next/link";
import type { TeaserProvider } from "@/lib/explore";

export function ProviderCard({
  p,
  loginHref,
  profileHref,
}: {
  p: TeaserProvider;
  /** Where "Book a Consultation" goes — the direct-book shortcut. */
  loginHref: string;
  profileHref: string;
}) {
  const isNew = p.employerCount === 0 && p.projectCount === 0;

  return (
    <article className="flex flex-col rounded-brand border border-line bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-magenta hover:shadow-brand">
      <div className="flex items-center gap-3">
        {}
        <span
          role="img"
          aria-label={`${p.firstName}, Panameer provider`}
          className="relative grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-full bg-bg-soft text-[18px] font-bold text-ink-2"
        >
          {p.firstName.charAt(0).toUpperCase()}
          {p.photoUrl && (
            <span
              aria-hidden
              className="absolute inset-0 bg-cover bg-center"
              /*
                `encodeURI` + escaped quotes: the url is stored data, and a
                stray `"` or `)` in it would otherwise close the CSS function
                early and let the rest of the string be parsed as style.
              */
              style={{
                backgroundImage: `url("${encodeURI(p.photoUrl).replace(/"/g, "%22")}")`,
              }}
            />
          )}
        </span>
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
      {/*
        `title` is the UNCAPPED headline: `p.title` may already end in an
        ellipsis from the soft cap, and hovering a truncated line to be shown
        the same truncation is a tooltip that does nothing.
      */}
      <p
        title={p.headline}
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
              {/* `P2-J1.1-E012` — a work-history row is a COMPANY, not an employer.
       A resume row looks identical for employment and for contract work, the
       parser cannot tell them apart, and a user must not have to declare their
       tax status to fill one in. `Company` names the ENTITY, which is constant;
       `Employer` names the RELATIONSHIP, which varies. ⚠ `Company/Employer` was
       considered and REJECTED — a slash label puts the tax question back into a
       UI that had deliberately stopped asking it. ⚠ `Organization` is the fully
       correct superset and was CONSIDERED, NOT CHOSEN (Scott took `Company` for
       length and schema fit); recorded so nobody reopens it unknowing. */}
              {p.employerCount} {p.employerCount === 1 ? "Company" : "Companies"}
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
          className="mt-2.5 block border-[1.5px] border-line px-4 py-2 text-center text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
        >
          Book a Consultation
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
