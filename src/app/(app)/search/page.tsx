import Link from "next/link";
import { guardPage } from "@/lib/guard";
import {
  getProviderFieldTree,
  getSkillsForField,
  getSkillsForRoleType,
} from "@/lib/catalog";
import { matchProvidersForSkills } from "@/lib/work-request-match";
import { formatCents } from "@/lib/display";

export const metadata = { title: "Search · Panameer" };

type SP = { role?: string; domain?: string; skill?: string };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await guardPage("authenticated");
  const sp = await searchParams;

  const tree = await getProviderFieldTree();

  const role = tree.find((r) => r.id === sp.role) ?? null;
  const domain = role?.domains.find((d) => d.id === sp.domain) ?? null;

  const skillOptions = domain
    ? await getSkillsForField(role!.id, domain.id)
    : role
      ? await getSkillsForRoleType(role.id)
      : [];
  const skill = skillOptions.find((s) => s.id === sp.skill) ?? null;

  const skillIds = skill ? [skill.id] : skillOptions.map((s) => s.id);
  const searched = Boolean(role || domain || skill);
  const result = searched
    ? await matchProvidersForSkills({ skillIds, pillarId: domain?.id ?? null })
    : null;

  const sel =
    "min-h-11 w-full rounded-brand border border-line bg-white px-3 text-[15px] text-ink";

  return (
    <div className="mx-auto w-full max-w-4xl">
      {}
      <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">Search</h1>
      {}
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        Find providers by role, domain and skill. Where a provider&apos;s depth and
        recency are recorded, the deepest match comes first; otherwise the strongest
        skill overlap does.
      </p>

      {}
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
          {}
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
            className="min-h-11 bg-magenta px-6 text-[14.5px] font-bold text-white hover:opacity-90"
          >
            Search
          </button>
        </div>
      </form>

      {}
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
          {}
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
