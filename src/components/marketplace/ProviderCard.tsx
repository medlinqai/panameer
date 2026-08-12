import Link from "next/link";
import type { TeaserProvider } from "@/lib/explore";

/**
 * THE MARKETPLACE TALENT CARD — one component, two callers.
 *
 * EXTRACTED, NOT COPIED (brief_home_build_in_app_2026-08-12 §6). It was a local
 * function inside `/explore`; the marketing home needed the same card, and the
 * brief is explicit that the home must use the REAL card rather than a bespoke
 * lookalike. A second hand-built version is how the teaser and the real listing
 * drift into showing different things about the same people — and this card in
 * particular carries a privacy rule (below) that a lookalike would not inherit.
 *
 * ⚠ THE MASKING IS THE POINT. `TeaserProvider` has no surname field at all
 * (see lib/explore.ts) and the CTA routes to `loginHref`, never to
 * /providers/[id] — E032: that route renders the full profile, so linking
 * straight there would hand over the very thing the card masks. Both
 * properties come along automatically now that there is one card.
 */
export function ProviderCard({ p, loginHref }: { p: TeaserProvider; loginHref: string }) {
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
          <p className="truncate text-[16px] font-bold text-ink">{p.firstName}</p>
          {p.location && (
            <p className="truncate text-[13px] text-ink-2">{p.location}</p>
          )}
        </div>
      </div>

      <p className="mt-3.5 line-clamp-2 text-[14.5px] font-semibold leading-snug text-ink">
        {p.headline}
      </p>

      {p.validated && (
        <p className="mt-2 text-[12.5px] font-bold text-magenta">✓ Validated</p>
      )}

      {p.skills.length > 0 && (
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
          E032 — GOES TO THE GATE, NOT TO THE PROFILE. /providers/[id] is a
          public route that renders the surname, so linking straight there
          would hand over the very thing the card masks.
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
