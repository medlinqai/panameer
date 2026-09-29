import Link from "next/link";
import { guardPage } from "@/lib/guard";
import {
  getProviderFieldTree,
  getSkillsForField,
  getSkillsForRoleType,
} from "@/lib/catalog";
import { matchProvidersForSkills } from "@/lib/work-request-match";
import { formatCents } from "@/lib/display";

/**
 * ── ⚠⚠⚠ SEARCH — PROVIDERS BY RDS (`P2-A5-E709`, WS-B, ruling 94e) ──────────
 *
 * ⚠⚠ **IT WAS EIGHT LINES OF `ComingSoon` WHILE SITTING IN THE PRIMARY CHROME.**
 * `AppHeader` renders `SEARCH_NAV` at `:195` and `:409`, so this was `E579` — a live
 * door onto a wall — on the surface a curious member clicks first.
 *
 * ── ⚠⚠⚠ THE RANKER IS NOT WRITTEN HERE, AND THAT IS THE POINT ──────────────
 *
 * ⚠⚠ **`matchProvidersForSkills` IS THE SAME FUNCTION THE BUYER'S SUGGESTED-PROVIDERS
 * LIST USES** — `E709` WS-A extracted it out of `matchProvidersFor` so both entry
 * points share one rule. ⚠ **NOTHING ABOUT RANKING LIVES IN THIS FILE.** The
 * precedence is `matchWeight → relevantSkills → growth → name`, and it is stated in
 * one place, in `work-request-match.ts`.
 * ⚠⚠⚠ **THE BRIEF SAID TO INVERT `work-feed.ts`, AND THAT WOULD HAVE BUILT THE SECOND
 * MATCHER IT FORBADE.** Measured 2026-09-29: `work-feed.ts` selects **`skill_id` only**
 * and ranks the `best` tab by **count of overlapping skills** (`:364`); it reads no
 * `weight`, no `months_total`, no `last_used`. **The weighted provider ranker already
 * existed in `work-request-match.ts`** — a different file from the one the brief named.
 *
 * ── ⚠⚠ A GET FORM, NOT A CLIENT COMPONENT ──────────────────────────────────
 *
 * ⚠ The state is three catalog ids, which belong in the URL: a search anybody can
 * link to, bookmark, or send to a colleague. ⚠⚠ Cascading narrows on SUBMIT rather
 * than on change — **one fewer moving part, and it works with JavaScript off.** The
 * same reason `/find-work` reads its tab from `?tab=`.
 *
 * ── ⚠⚠⚠ THE IDS COME FROM A FORM AND ARE NEVER TRUSTED ─────────────────────
 *
 * ⚠ Every id is **resolved against the catalog before use** — an id that is not in
 * the tree becomes `null` and is ignored, so nothing raw reaches the query. ⚠⚠ These
 * are CATALOG ids (public reference rows carrying no ownership), not the
 * profile-or-person ids load-bearing rule 5 forbids taking from a client. ⚠ The page
 * itself is guarded, and the provider set is scoped by `marketplaceVisibleWhere()`
 * inside the matcher.
 *
 * ── ⚠⚠ RULING 95's FOUR, ANSWERED ─────────────────────────────────────────
 *
 * ⚠ **1 PAGE NAME** — the `<h1>` is the single word **"Search"**, which is
 * `SEARCH_NAV.label` **verbatim** (`nav.ts:117`). ⚠⚠ It is deliberately NOT *"Find
 * Providers"*: that would read better and would make the name a member clicks differ
 * from the name they arrive at, which is the mismatch `E708` had to report. **Renaming
 * the menu item is Scott's** (`E533`), so the heading matches the menu and the
 * subtitle carries the meaning.
 * ⚠ **2 MOBILE VIEW** — the results are a single column at every width and the
 * pickers stack; `/search` joins the signed-in width ladder (ruling 104) and
 * `check:mobile-rows` has no new row here because **this page adds no horizontal
 * row** — stated rather than left to the gate's silence.
 * ⚠⚠⚠ **3 NOTIFICATION — NONE, AND THAT IS CORRECT, NOT MISSING.** Searching changes
 * no state and tells nobody anything; a notification here would be an echo of the
 * member's own keystroke, which is ruling 82a's rejected shape. ⚠ **A notification
 * becomes owed the moment a search RESULT is acted on** — choosing a provider writes a
 * line, and that is WS-C, which is **skipped** (below).
 * ⚠⚠⚠ **4 CFG EVENT TO THE WORKLIST — NONE, FOR THE SAME REASON.** Nothing is waiting
 * on anybody after a search.
 *
 * ── ⚠⚠⚠ WS-C IS SKIPPED, AND THE BRIEF'S OWN CONDITION IS WHY ──────────────
 *
 * ⚠ The brief: *"IF THE COMMISSIONS BRIEF HAS NOT LANDED, STOP AT WS-B AND SAY SO.
 * Writing a provider onto a line without the flag and the rate leaves money undecided
 * on a real row."* ⚠⚠ **MEASURED: `WorkRequestLine` HAS `provider_person_id` AND
 * `unit_price_cents` AND NO `sole_sourced` AND NO RATE OR COMMISSION COLUMN.**
 * `sole_sourced` is on **`WorkRequest`** (`schema.prisma:3026`); `fee_bps` exists only
 * on `WorkOrder` (`:5671`) and `WorkOrderLine` (`:5714`, *"THE AUTHORITY"*), **both
 * created at HIRE — downstream of the cart.**
 * ⚠⚠⚠ **SO THE RESOLVED RATE CANNOT BE STAMPED ON A LINE WITHOUT A SCHEMA CHANGE, AND
 * ONLY ITEM 1 OF THIS RUN TOUCHES THE SCHEMA.** There is therefore **no button here
 * that puts a provider on a cart** — an `Invite` control that wrote a line without the
 * tier would be exactly the money-undecided row the brief refuses.
 * ⚠ Each result links to the provider's own page, which is a read and commits nothing.
 */
export const metadata = { title: "Search · Panameer" };

type SP = { role?: string; domain?: string; skill?: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  /* ⚠ `authenticated`, matching `route-access.ts:199` — this brief does not narrow
     access nobody asked it to narrow. ⚠⚠ Results are providers, which is a
     buyer-shaped view; whether a seller should see it is a product call, flagged. */
  await guardPage("authenticated");
  const sp = await searchParams;

  const tree = await getProviderFieldTree();

  /* ⚠⚠ RESOLVED, NEVER TRUSTED. An unknown id simply does not resolve. */
  const role = tree.find((r) => r.id === sp.role) ?? null;
  const domain = role?.domains.find((d) => d.id === sp.domain) ?? null;

  /*
    ⚠⚠⚠ THE PAIR, NOT THE DOMAIN ALONE — `getSkillsForField` EXISTS FOR THIS AND ITS
    OWN DOCBLOCK SAYS WHY: *"filtering on the domain alone would mix
    Application-Specific 'Payables' with Operations-Specific 'Payables Specialist'."*
    ⚠ Using `getSkillsForPillar` here would have produced a picker that offers skills
    from a role the member did not choose.
  */
  const skillOptions = domain
    ? await getSkillsForField(role!.id, domain.id)
    : role
      ? await getSkillsForRoleType(role.id)
      : [];
  const skill = skillOptions.find((s) => s.id === sp.skill) ?? null;

  /*
    ── ⚠⚠ RDS → A SKILL SET, AT THE NARROWEST LEVEL THE MEMBER CHOSE ──────────
    ⚠ A named skill is that one skill. A role or a domain is every skill beneath it,
    which is a WIDER match rather than a vaguer one — the ranker still orders by
    weighted depth, so a deep specialist rises above a shallow generalist either way.
  */
  const skillIds = skill ? [skill.id] : skillOptions.map((s) => s.id);
  const searched = Boolean(role || domain || skill);
  const result = searched
    ? await matchProvidersForSkills({ skillIds, pillarId: domain?.id ?? null })
    : null;

  const sel =
    "min-h-11 w-full rounded-brand border border-line bg-white px-3 text-[15px] text-ink";

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ⚠ Ruling 95 check 1 — the heading is the menu label, word for word. */}
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">Search</h1>
      {/*
        ── ⚠⚠⚠ THE COPY WAS CORRECTED BEFORE IT SHIPPED, AND THE MEASUREMENT IS WHY ──

        ⚠ It read: *"Results are ranked by how deep and how recent their experience is —
        not by how many boxes they ticked."* ⚠⚠⚠ **THAT IS FALSE FOR 57 OF 60 PROVIDERS.**
        Measured 2026-09-29: **365 `ProviderSkill` rows, 46 with `weight > 0` (12.6%), 17
        with months, 17 with `last_used` — and only 3 of 60 profiles hold ANY weighted
        skill.** ⚠ So for nearly everybody `matchWeight` is `0` and the order falls to the
        tie-breakers: **matching skills, then growth, then name.**
        ⚠⚠ **THAT IS `E551` ARRIVING ON A BUYER-FACING SURFACE** — skills are never linked
        to dated jobs on the import path, so the depth exists in the résumés and not in the
        column. ⚠ The ranking is correct; the SIGNAL is mostly absent.
        ⚠⚠⚠ **A SENTENCE PROMISING DEPTH-RANKING OVER A COLUMN THAT IS 87% EMPTY IS THE
        FAILURE MODE SCOTT NAMED:** *"an overstated number on the page I intend to sell on
        is the one failure mode I will not accept."* ⚠ Counting rule 3 applies too — a
        control says what it governs **at the point it governs it**, so the ordering
        explains itself here rather than in a footnote.
        ⚠ **DO NOT "IMPROVE" THIS BACK.** When `E551` lands and weights are real, the
        second sentence is what changes, and it should change because the data did.
      */}
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        Find providers by role, domain and skill. Where a provider&apos;s depth and
        recency are recorded, the deepest match comes first; otherwise the strongest
        skill overlap does.
      </p>

      {/* ⚠⚠ A GET FORM: the search lives in the URL and is linkable. */}
      <form method="get" className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-ink-2">Role</span>
          <select name="role" defaultValue={role?.id ?? ""} className={sel}>
            <option value="">Any role</option>
            {tree.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display ?? r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-ink-2">Domain</span>
          {/*
            ⚠ DISABLED UNTIL A ROLE IS CHOSEN, because a domain means nothing without
            one: the same domain name sits under several roles with entirely different
            skills. ⚠⚠ That is the catalog's pair rule showing up in the UI rather
            than being worked around in it.
          */}
          <select
            name="domain"
            defaultValue={domain?.id ?? ""}
            disabled={!role}
            className={sel + (role ? "" : " opacity-50")}
          >
            <option value="">{role ? "Any domain" : "Pick a role first"}</option>
            {role?.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] font-bold text-ink-2">Skill</span>
          <select
            name="skill"
            defaultValue={skill?.id ?? ""}
            disabled={skillOptions.length === 0}
            className={sel + (skillOptions.length ? "" : " opacity-50")}
          >
            <option value="">
              {skillOptions.length ? "Any skill" : "Pick a role first"}
            </option>
            {skillOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-3">
          <button
            type="submit"
            className="min-h-11 rounded-full bg-magenta px-6 text-[14.5px] font-bold text-white hover:opacity-90"
          >
            Search
          </button>
        </div>
      </form>

      {/*
        ── ⚠⚠⚠ NOTHING IS STYLED AS A FEATURE UNTIL IT HAS CONTENT ────────────
        ⚠ The brief: *"IT MUST NOT RENDER AN EMPTY LIST STYLED AS A FEATURE — IF
        NOTHING MATCHES, SAY SO IN WORDS."* ⚠⚠ So each state below is a SENTENCE, and
        the list markup only exists when there are rows to put in it.
        ⚠ Ruling 18 governs the wording: short, neutral, no apology, no roadmap, and
        nothing that blames the member for the result.
      */}
      {!searched && (
        <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
          Pick a role to start. Adding a domain and a skill narrows the match; leaving
          them on <strong className="text-ink">Any</strong> widens it.
        </p>
      )}

      {searched && result && result.providers.length === 0 && (
        <p className="mt-6 text-[15px] leading-relaxed text-ink-2">
          No provider on Panameer holds{" "}
          {skill ? (
            <>
              <strong className="text-ink">{skill.name}</strong> yet
            </>
          ) : (
            <>these skills yet</>
          )}
          . Widening the domain or the skill usually finds someone adjacent.
        </p>
      )}

      {searched && result && result.providers.length > 0 && (
        <>
          {/* ⚠ A real count, in ink — the 2026-09-23 counting rules. */}
          <p className="mt-6 text-[13.5px] font-bold text-ink-2">
            {result.providers.length}{" "}
            {result.providers.length === 1 ? "provider" : "providers"}, best match
            first
          </p>
          <ul className="mt-3 space-y-3">
            {result.providers.map((p) => (
              <li
                key={p.profileId}
                className="rounded-brand border border-line bg-white p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[17px] font-bold text-ink">
                    <Link href={`/providers/${p.profileId}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </h2>
                  {/* ⚠⚠ THE RATE IS A RANGE (a locked decision), so both ends print. */}
                  {p.rateMinCents != null && (
                    <span className="text-[13.5px] text-ink-2">
                      {formatCents(p.rateMinCents, p.currency ?? "USD")}
                      {p.rateMaxCents != null &&
                        p.rateMaxCents !== p.rateMinCents &&
                        ` – ${formatCents(p.rateMaxCents, p.currency ?? "USD")}`}
                    </span>
                  )}
                </div>
                {p.headline && <p className="text-[14px] text-ink-2">{p.headline}</p>}
                {/*
                  ── ⚠⚠⚠ `depthMonths` IS DELIBERATELY NOT PRINTED ──────────────

                  ⚠⚠ **`ProviderSkill.months_total` IS 0 FOR MOST ROWS AND THAT IS NOT
                  ZERO EXPERIENCE — IT IS UNCOUNTABLE.** `E551` measured it: **436 of
                  463 rows carry no months**, because skills are not linked to dated
                  jobs on the import path, not because the work did not happen.
                  ⚠⚠⚠ **SO "0 months" BESIDE A REAL CONSULTANT'S NAME WOULD BE A FALSE
                  FIGURE ON THE SURFACE PANAMEER SELLS ON** — the family Scott named as
                  *"the one failure mode I will not accept"*. ⚠ Counting rule 1: a
                  truncated chain is uncountable at the point it stops, and this one
                  stops at job-skill attachment.
                  ⚠ `lastUsed` IS printed when it exists, because a real date is a real
                  fact; when it is null nothing is claimed either way.
                */}
                {p.lastUsed && (
                  <p className="mt-1 text-[13px] text-ink-2">
                    Last used {p.lastUsed.getFullYear()}
                  </p>
                )}
                {/*
                  ⚠⚠ WHY THEY MATCHED, NAMED. A ranked list that will not say what it
                  ranked on is asking to be trusted rather than read — and these are
                  the provider's SHOWN skills, so the profile will agree with this row
                  (`E517`).
                */}
                {p.matchedSkillNames.length > 0 && (
                  <p className="mt-1.5 text-[13.5px] text-ink-2">
                    Matched on {p.matchedSkillNames.slice(0, 6).join(" · ")}
                    {p.matchedSkillNames.length > 6 &&
                      ` +${p.matchedSkillNames.length - 6} more`}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
