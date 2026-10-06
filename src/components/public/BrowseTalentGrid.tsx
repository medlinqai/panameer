import Link from "next/link";
import {
  BROWSE_PAGE_SIZE,
  CARD_LOCK_COPY,
  browseTalent,
  previewCountries,
  type MaskedCard,
} from "@/lib/masked-profile";
import { PLACEHOLDER } from "@/lib/masked-photo";
import { browseAllowed } from "@/lib/public-browse-limit";
import {
  Chip,
  LockLine,
  BlurredField,
  MaskedAvatar,
  PublicSecondary,
} from "@/components/public/masked-ui";

export async function BrowseTalentGrid({
  q,
  country,
  minYears,
  take,
}: {
  q?: string;
  country?: string;
  minYears?: number;
  take?: number;
}) {
  if (!(await browseAllowed())) return <TooFast />;

  const size = take && take > 0 ? take : BROWSE_PAGE_SIZE;
  const [{ cards, hasMore }, countries] = await Promise.all([
    browseTalent({ q, country, minYears, take: size }),
    previewCountries(),
  ]);

  const qs = (over: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const all = { q, country, years: minYears, take: size, ...over };
    for (const [k, v] of Object.entries(all)) {
      if (v !== undefined && v !== "" && v !== 0) sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `/explore?${s}` : "/explore";
  };

  return (
    <>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2">
        Browse Talent
      </p>
      <h1 className="text-balance text-[24px] font-bold leading-tight tracking-[-0.5px] sm:text-[30px]">
        Oracle experts, verified by their work
      </h1>
      <p className="mt-2 max-w-[640px] text-[14.5px] leading-relaxed text-ink-2">
        See the depth of every profile before you join. Register free to see who
        they are and to contact or hire them.
      </p>

      {/* SORT IS NOT A CONTROL. The mockup draws a "Sort: Search Score" */}
      <form method="get" action="/explore" className="mt-5 flex flex-wrap gap-2.5">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by skill, e.g. Oracle Procurement Cloud"
          aria-label="Search by skill"
          className="min-w-[220px] flex-1 rounded-[4px] border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink placeholder:text-ink-3 dark:border-white/20 dark:bg-white/5 dark:text-white"
        />
        <select
          name="country"
          defaultValue={country ?? ""}
          aria-label="Country"
          className="rounded-[4px] border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink dark:border-white/20 dark:bg-white/5 dark:text-white"
        >
          <option value="">All countries</option>
          {/* Only countries with an eligible provider — see */}
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
        <select
          name="years"
          defaultValue={minYears ? String(minYears) : ""}
          aria-label="Minimum years of experience"
          className="rounded-[4px] border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink dark:border-white/20 dark:bg-white/5 dark:text-white"
        >
          <option value="">Any experience</option>
          <option value="5">5+ years</option>
          <option value="10">10+ years</option>
          <option value="15">15+ years</option>
          <option value="20">20+ years</option>
        </select>
        <button
          type="submit"
          className="border border-ink bg-ink px-[18px] py-2.5 text-[13.5px] font-semibold text-white hover:bg-ink/90"
        >
          Search
        </button>
      </form>

      {cards.length === 0 ? (
        // THE HONEST ZERO. It says what was searched and offers a wider
        <div className="mt-8 max-w-[620px]">
          <p className="text-[15px] leading-relaxed text-ink-2">
            No profiles match that yet. Try a broader term — a domain like
            Procurement or Financials, or a system name — or{" "}
            <Link href="/explore" className="font-semibold text-magenta-dark hover:underline dark:text-magenta">
              clear the filters
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <TalentCard key={c.id} c={c} />
            ))}
          </div>

          {/* deliberate on an ordering whose key is a column (see `browseTalent`) */}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <PublicSecondary href={qs({ take: size + BROWSE_PAGE_SIZE })}>
                Show More
              </PublicSecondary>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** ONE MASKED CARD. THE AVATAR IS A DRAWING AND THE NAME IS NOT A FIELD — */
function TalentCard({ c }: { c: MaskedCard }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-[10px] border border-line p-[18px] transition-colors hover:border-magenta dark:border-white/15">
      <div className="flex items-center gap-3">
        {/* THE BLURRED PHOTO (`E767`) — bytes, not a URL. See `MaskedCard.photoBlur`. */}
        <MaskedAvatar blur={c.photoBlur} />
        <div className="min-w-0">
          {/* The NAME, blurred and constant — the card had no name line at all */}
          <BlurredField label="Name hidden — join free to see it" className="text-[13px] font-semibold">
            {PLACEHOLDER.name}
          </BlurredField>
          <h2 className="text-[15px] font-semibold leading-tight" title={c.title}>
            {c.title}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            {[c.location, c.experience ? `${c.experience}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {/* The score is the one figure on the card, and it is EXACT — computed */}
        <div className="ml-auto shrink-0 text-center">
          <b className="block text-[18px] font-bold leading-none">{c.score}</b>
          <span className="text-[10px] tracking-[0.06em] text-ink-3">SCORE</span>
        </div>
      </div>

      {c.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {c.skills.slice(0, 3).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
      )}

      {/* A FACT ROW THAT ONLY PRINTS FACTS IT HAS. A `0` certification count */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[12.5px] text-ink-2 dark:border-white/15">
        <span>
          Certifications <b className="font-semibold text-ink dark:text-white">{c.certificationCount}</b>
        </span>
        {c.industries.length > 0 && (
          <span className="truncate" title={c.industries.join(", ")}>
            Industries{" "}
            <b className="font-semibold text-ink dark:text-white">
              {c.industries.join(", ")}
            </b>
          </span>
        )}
      </div>

      <LockLine>{CARD_LOCK_COPY}</LockLine>

      <div className="mt-auto pt-1">
        <PublicSecondary href={`/providers/${c.id}`} className="w-full">
          View Preview
        </PublicSecondary>
      </div>
    </article>
  );
}

/** WHAT A THROTTLED CALLER SEES. It is a human-readable pause, not an error */
function TooFast() {
  return (
    <div className="mx-auto max-w-[620px] py-12 text-center">
      <h1 className="text-[24px] font-bold">One moment</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        That was a lot of requests in a short time. Give it a few seconds and
        reload, or{" "}
        <Link href="/join" className="font-semibold text-magenta-dark hover:underline dark:text-magenta">
          join free
        </Link>{" "}
        to see full profiles without the wait.
      </p>
    </div>
  );
}
