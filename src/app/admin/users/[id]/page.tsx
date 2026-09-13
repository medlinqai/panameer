import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { BackLink } from "@/components/console/BackLink";
import { LevelPill } from "@/components/console/LevelPill";
import { jobsFor } from "@/lib/user-jobs";
import { blockingFor, levelFor, type LevelSubject } from "@/lib/user-levels";
import { REGISTERED_SITE_NAME } from "@/lib/company";

export const dynamic = "force-dynamic";

/**
 * ADMIN → USERS → ONE PERSON (`P1-A1.5-E460`).
 *
 * ── ⚠⚠ WHY THIS PAGE EXISTS, AND WHY THE OLD ANSWER WAS WRONG ───────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E443`): *"Only providers have a page
 * (`/providers/[id]`). Requesters and buyers have none. Do not invent a route."*
 * That was true of the REPO and false of the PRODUCT.
 *
 * **SCOTT, 2026-09-12, asked why only some names were hyperlinked:**
 * ⚠ ***"Everyone has a profile...just sellers have more info on theirs, no?"***
 *
 * He is right, and registration proves it: Level 1 asks for name · email · phone
 * · title · profile · ToS, IDENTICALLY on both sides of the marketplace. A
 * requester has a profile; a buyer has a profile; a recruiter has a profile. A
 * seller's is simply LONGER. ⚠ SO THE GRID WAS NOT MISSING LINKS — THE APP WAS
 * MISSING ONE PAGE. Every one of the 199 rows links here now.
 *
 * ── ⚠ RENDER WHAT THEY HAVE; SAY SO WHERE THEY HAVE NOTHING ─────────────────
 *
 * Every section below is PRESENT for everybody and says "no data" when there is
 * none. ⚠ A SECTION MUST NOT VANISH: an admin looking for a company needs to see
 * "No company on file" — an absent section is indistinguishable from a section
 * that failed to load, and it is what makes two people's pages differ in SHAPE
 * rather than in CONTENT. The one exception is `Seller detail`, which is omitted
 * only when the underlying model does not exist for that person at all — there
 * is no honest empty rendering of a profile they were never offered.
 *
 * ── ⚠⚠ READ ONLY ────────────────────────────────────────────────────────────
 *
 * No unlock, no edit, no delete, and the lock state renders as a disabled
 * checkbox exactly as it does on the grid. An action needs its own brief, and a
 * button that looks live but is not is worse than no button.
 *
 * ⚠ NO ROUTE REGISTRATION WAS NEEDED: `route-access.ts` already gates the whole
 * `/admin` prefix on `canAdminister`, and `admin/layout.tsx` guards above this.
 */

/** A section that is always present, so two people's pages have one shape. */
function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-brand border border-line bg-white p-5">
      <h2 className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
        {title}
      </h2>
      {note && <p className="mt-1 text-[12.5px] text-ink-2">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One labelled value. ⚠ An absent value prints an em-dash, never an empty cell. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line py-2 last:border-0">
      <span className="w-[150px] shrink-0 text-[12.5px] text-ink-2">{label}</span>
      <span className="min-w-0 text-[14px]">{value}</span>
    </div>
  );
}

/** ⚠ THE HONEST EMPTY. Says what is missing, in the admin's words. */
function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[14px] text-ink-2">{children}</p>;
}

const d = (v: Date | null | undefined) =>
  v
    ? v.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const person = await prisma.person.findUnique({
    where: { id },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      title: true,
      phone: true,
      photo_url: true,
      created_at: true,
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
      user: {
        select: {
          email: true,
          email_verified: true,
          tos_accepted_at: true,
          locked: true,
          locked_until: true,
          failed_login_attempts: true,
          last_login: true,
          is_system_admin: true,
        },
      },
      company: {
        select: {
          name: true,
          tax_type: true,
          tin: true,
          country: true,
          sites: {
            where: { name: REGISTERED_SITE_NAME },
            select: {
              name: true,
              addresses: {
                select: { line1: true, city: true, state: true, postal_code: true, country: true },
                take: 1,
              },
            },
            take: 1,
          },
        },
      },
      payoutMethods: { select: { id: true, kind: true, label: true, last4: true, country: true } },
      requesterProfile: { select: { id: true, onboarding_step: true, completed_at: true } },
      buyerProfile: { select: { id: true } },
      providerProfile: {
        select: {
          id: true,
          status: true,
          headline: true,
          work_method: true,
          validation_status: true,
          validation_requested_at: true,
          validated_at: true,
          completeness: true,
        },
      },
    },
  });

  if (!person) notFound();

  const u = person.user;
  const name = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim() || "(unnamed)";

  /* ⚠ THE GRID'S RULES, IMPORTED — not re-derived. See `lib/user-jobs.ts` and
     `lib/user-levels.ts`; two copies is how the grid and the badge drifted. */
  const jobs = jobsFor(person);
  const registeredAddress = person.company?.sites?.[0]?.addresses?.[0] ?? null;
  const subject: LevelSubject = {
    firstName: person.first_name,
    lastName: person.last_name,
    emailVerified: u?.email_verified ?? null,
    tosAcceptedAt: u?.tos_accepted_at ?? null,
    phone: person.phone,
    title: person.title,
    hasProfile: !!person.requesterProfile || !!person.providerProfile,
    companyTaxType: person.company?.tax_type ?? null,
    companyTin: person.company?.tin ?? null,
    companyRegisteredAddress: !!registeredAddress,
    payoutMethodCount: person.payoutMethods.length,
  };
  const level = levelFor(subject);
  const blocking = blockingFor(subject);

  const lockTitle = u?.locked
    ? u.locked_until
      ? `Locked until ${u.locked_until.toLocaleTimeString("en-GB")} — ${u.failed_login_attempts} failed attempts`
      : `Locked indefinitely — ${u.failed_login_attempts} failed attempts`
    : u?.failed_login_attempts
      ? `Not locked — ${u.failed_login_attempts} failed attempts`
      : "Not locked";

  return (
    <div className="mx-auto w-full max-w-4xl">
      {/* ⚠ THE MEDLINQ PATTERN: a way back, ABOVE the title. Same component the
          tile drill-ins will use (`E455`), so the two cannot diverge. */}
      <BackLink href="/admin/buyers-sellers" label="Users" />
      <h1 className="mt-1 font-display text-[26px] font-bold">{name}</h1>
      <p className="mt-0.5 text-[13px] text-ink-2">
        {jobs.length ? jobs.join(" · ") : "No job yet"} · joined {d(person.created_at)}
      </p>

      <div className="mt-5 grid gap-4">
        {/* 1 · IDENTITY */}
        <Section
          title="Identity"
          note="The full email lives here — the grid truncates it to fit."
        >
          <div className="mb-3 flex items-center gap-3">
            <Avatar
              firstName={person.first_name ?? ""}
              lastName={person.last_name ?? ""}
              photoUrl={person.photo_url}
              size={48}
            />
            <span className="text-[13px] text-ink-2">
              {person.photo_url ? "Photo on file" : "No photo on file"}
            </span>
          </div>
          <Row label="Name" value={name} />
          <Row label="Title" value={person.title || <span className="text-ink-2">No title on file</span>} />
          <Row
            label="Email"
            value={u?.email ?? <span className="text-ink-2">No login on this record</span>}
          />
          <Row label="Phone" value={person.phone || <span className="text-ink-2">No phone on file</span>} />
          <Row
            label="Email verified"
            value={u?.email_verified ? d(u.email_verified) : <span className="text-ink-2">Not verified</span>}
          />
          <Row label="Terms accepted" value={u?.tos_accepted_at ? d(u.tos_accepted_at) : <span className="text-ink-2">Not recorded</span>} />
          <Row label="Last login" value={d(u?.last_login)} />
          <Row
            label="Locked"
            value={
              <span className="inline-flex items-center gap-2">
                {/* ⚠ DISABLED, exactly as on the grid. This page is READ ONLY. */}
                <input
                  type="checkbox"
                  checked={!!u?.locked}
                  disabled
                  aria-label={lockTitle}
                  className="h-4 w-4 accent-magenta"
                />
                <span className="text-[13px] text-ink-2">{lockTitle}</span>
              </span>
            }
          />
        </Section>

        {/* 2 · JOBS */}
        <Section
          title="Jobs"
          note="Buyer where a BuyerProfile exists, Requester where only a RequesterProfile does, and neither when the person has not answered yet."
        >
          {jobs.length ? (
            <div className="flex flex-wrap gap-2">
              {jobs.map((j) => (
                <span
                  key={j}
                  className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-[12px] font-semibold text-ink-2"
                >
                  {j}
                </span>
              ))}
            </div>
          ) : (
            <Empty>
              No job yet — this person carries the buyer flag but has answered
              neither side of the fork.
            </Empty>
          )}
          {u?.is_system_admin && (
            <p className="mt-2 text-[13px] text-ink-2">Also a Panameer administrator.</p>
          )}
        </Section>

        {/* 3 · LEVEL */}
        <Section title="Level" note="The lifecycle position, and what stands between this person and the next stage.">
          <div className="flex flex-wrap items-center gap-3">
            <LevelPill level={level} blocking={blocking} />
            <span className="text-[13.5px] text-ink-2">
              {blocking.length ? (
                <>
                  Next: <b className="font-semibold text-ink">{blocking.join(", ")}</b>
                </>
              ) : (
                "Nothing outstanding at this level."
              )}
            </span>
          </div>
        </Section>

        {/* 4 · COMPANY */}
        <Section title="Company">
          {person.company ? (
            <>
              <Row label="Name" value={person.company.name} />
              <Row
                label="Tax type"
                value={person.company.tax_type ?? <span className="text-ink-2">Not captured</span>}
              />
              <Row label="TIN" value={person.company.tin ?? <span className="text-ink-2">Not captured</span>} />
              <Row
                label="Registered address"
                value={
                  registeredAddress ? (
                    [
                      registeredAddress.line1,
                      registeredAddress.city,
                      registeredAddress.state,
                      registeredAddress.postal_code,
                      registeredAddress.country,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  ) : (
                    <span className="text-ink-2">No registered address on file</span>
                  )
                }
              />
              {/* ⚠ THE HONEST CAVEAT. Every account is given a placeholder company
                  named after the person at sign-up (`E418`), so a name here is not
                  evidence that anybody entered one. */}
              <p className="mt-2 text-[12.5px] text-ink-2">
                Every account is created with a placeholder company named after the
                person, so a name alone is not evidence that company details were given.
              </p>
            </>
          ) : (
            <Empty>No company on file.</Empty>
          )}
        </Section>

        {/* 5 · PAYMENT */}
        <Section title="Payment">
          {person.payoutMethods.length ? (
            person.payoutMethods.map((m) => (
              <Row
                key={m.id}
                label={m.kind}
                value={`${m.label ?? "Method"}${m.last4 ? ` ···· ${m.last4}` : ""}${m.country ? ` · ${m.country}` : ""}`}
              />
            ))
          ) : (
            <Empty>Not a payee — no payout method on file.</Empty>
          )}
        </Section>

        {/* 6 · SELLER DETAIL — ⚠ only where the model exists at all. */}
        {person.providerProfile && (
          <Section
            title="Seller detail"
            note="What a seller has and a buyer does not — the longer profile."
          >
            <Row label="Headline" value={person.providerProfile.headline || <span className="text-ink-2">No headline</span>} />
            <Row label="Status" value={person.providerProfile.status} />
            <Row
              label="Work method"
              value={person.providerProfile.work_method ?? <span className="text-ink-2">Not chosen</span>}
            />
            <Row label="Completeness" value={`${person.providerProfile.completeness}%`} />
            <Row
              label="Validation"
              value={
                <>
                  {person.providerProfile.validation_status}
                  {person.providerProfile.validation_requested_at
                    ? ` — asked ${d(person.providerProfile.validation_requested_at)}`
                    : ""}
                  {person.providerProfile.validated_at
                    ? ` · validated ${d(person.providerProfile.validated_at)}`
                    : ""}
                </>
              }
            />
            <Row
              label="Public profile"
              value={
                <Link
                  href={`/providers/${person.providerProfile.id}`}
                  className="font-semibold text-magenta-ink underline decoration-magenta-ink/30 underline-offset-2 hover:text-magenta-ink-hover"
                >
                  /providers/{person.providerProfile.id.slice(0, 8)}…
                </Link>
              }
            />
          </Section>
        )}
      </div>
    </div>
  );
}
