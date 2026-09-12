import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  TileRow,
  Listing,
  VolumeFooter,
  StubEmpty,
} from "@/components/console/ConsolePage";
import { BoardRefresh } from "@/components/admin/BoardRefresh";
import {
  ONBOARDING_STATUSES,
  buyerStatus,
  sellerStatus,
  sidesFor,
  type OnboardingStatus,
} from "@/lib/onboarding-status";
import {
  LEVEL_TILES,
  levelCounts,
  levelFor,
  blockingFor,
  type LevelSubject,
} from "@/lib/user-levels";
import { REGISTERED_SITE_NAME } from "@/lib/company";

export const dynamic = "force-dynamic";

/**
 * Admin → Buyers/Sellers (`E013`, rebuilt by `P1-J1.1-E253` · `E255` · `E256` ·
 * `E269` · `E271`).
 *
 * ⚠ IT WAS A ROSTER: name, email, derived role, joined, and a `Status` column
 * that printed a literal em-dash for every row. It is now an onboarding board —
 * where each person actually is, and what is blocking them.
 *
 * ⚠⚠ `Requester` NO LONGER REPORTS AS `unknown`, AND THAT WAS THE HEADER'S OWN
 * COMPLAINT. ⚠ SUPERSEDED, quoted not deleted: *"'Requester' has no flag of its
 * own yet (that distinction is the separate USER_TYPE x JOB brief), so it reports
 * as unknown rather than being folded into Buyers, which would silently overstate
 * one and erase the other."*
 * `USER_CLASS` / `USER_JOB` are STILL not in the schema — that has not changed.
 * What changed is that this page stopped waiting for them and now derives
 * Requester from OWNING A `RequesterProfile`, which is the same expression
 * `lib/me.ts` already uses for `roles.isRequester`. One definition, two readers.
 *
 * ⚠ STATUS IS DERIVED IN `lib/onboarding-status.ts` — no new column. See that
 * file for Scott's four statuses and why the buyer-side `Validated` has no
 * mechanism behind it.
 *
 * ── ⚠ THE TREND SHIPPED (`E257`), ONE BRIEF LATE AND FOR GOOD REASON ───────
 *
 * ⚠ SUPERSEDED, quoted not deleted, because the stop was CORRECT BEHAVIOUR and
 * the record of why matters more than the fact it is now gone. This header used
 * to read: *"`E257` asked for the progression tiles to be CLICKABLE... IT IS NOT
 * BUILT, and it stopped on two independent conditions the brief itself set as
 * stop conditions: 1. `.claude/skills/dataviz` DOES NOT EXIST... 2. THE
 * BUYER-SIDE `Validated` HAS NO TIMESTAMP TO TREND ON."*
 *
 * Both are resolved, and differently:
 *   1. THE SKILL REQUIREMENT WAS WITHDRAWN, not satisfied — *"THAT PATH DOES NOT
 *      EXIST AND NEVER DID — chat's error, not a real gate."* The chart rules
 *      were inlined in the brief instead and are followed in
 *      `components/admin/StatusTrendChart.tsx`.
 *   2. THE MISSING COLUMN WAS ADDED on Scott's instruction (`E269b`):
 *      *"timestamp the validated, create the trending report."* Refusing to
 *      invent it was right; being TOLD to add it is a different thing.
 *
 * Tiles now link to `/admin/buyers-sellers/trend`.
 */
export default async function Page() {
  /*
    ONE READ, ALL PEOPLE. 123 users today, so counting in JS from a single query
    is cheaper than four round-trips per status per side to Supabase — and it
    guarantees the tiles and the table are computed from the SAME snapshot. Two
    queries could disagree by whatever landed between them, which on a live board
    reads as a bug.
  */
  const people = await prisma.person.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      created_at: true,
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
      /*
        ⚠ THE COLUMNS THE LIFECYCLE LEVELS NEED (`P1-A1.5-E430` WS-4), loaded in
        the SAME single read as everything else — `lib/user-levels.ts` takes a
        total shape on purpose, so a caller cannot forget one and have a level
        silently fail. ⚠ `Company.name` IS NOT A LEVEL SIGNAL: every account is
        given a placeholder company named after the person (`E418`).
      */
      phone: true,
      title: true,
      photo_url: true,
      company: {
        select: {
          name: true,
          tax_type: true,
          tin: true,
          /* The `Registered` site's address is Level 2's address (`E280`). */
          sites: {
            where: { name: REGISTERED_SITE_NAME },
            select: { addresses: { select: { id: true }, take: 1 } },
            take: 1,
          },
        },
      },
      payoutMethods: { select: { id: true }, take: 1 },
      user: {
        select: {
          email: true,
          email_verified: true,
          tos_accepted_at: true,
          locked: true,
          locked_until: true,
          failed_login_attempts: true,
          last_login: true,
        },
      },
      requesterProfile: {
        select: {
          onboarding_step: true,
          completed_at: true,
          validation_status: true,
        },
      },
      providerProfile: {
        select: {
          status: true,
          validation_status: true,
          validation_requested_at: true,
          validated_at: true,
        },
      },
    },
  });

  /*
    THE PROGRESSION COUNTS (`E256`).

    ⚠ COUNTED PER SIDE, NOT PER PERSON. A dual-role account holds a status on
    each side, so the tiles total more than the headcount — that is correct and
    the caption under the strip says so. Collapsing to one status per person
    would have to pick a winner and would hide the other half.
  */
  const counts = new Map<OnboardingStatus, number>(
    ONBOARDING_STATUSES.map((s) => [s, 0])
  );
  let sideTotal = 0;
  for (const p of people) {
    for (const side of sidesFor(p)) {
      const st =
        side === "BUYER"
          ? buyerStatus(p.requesterProfile)
          : sellerStatus(p.providerProfile);
      counts.set(st, (counts.get(st) ?? 0) + 1);
      sideTotal++;
    }
  }

  /*
    ── ⚠⚠ THE LIFECYCLE FUNNEL, CUMULATIVE (`P1-A1.5-E430` WS-4 / WS-5b) ──────

    **SCOTT, 2026-09-12:** *"replace the four wizard-status tiles with FIVE
    lifecycle tiles (verified -> user -> company -> payee, plus total). Counts
    cumulative so the drop-off between stages is visible."*

    ⚠⚠ COUNTED PER **PERSON**, WHERE THE OLD TILES COUNTED PER **SIDE**, and the
    caption under the strip had to change with them. A level is a capability the
    PERSON holds; a wizard status belongs to a side. Counting levels per side
    would double every dual-role account and make the funnel wider than the
    headcount.

    ⚠ NEITHER MODEL IS RENAMED, on Scott's instruction. `ONBOARDING_STATUSES`
    still exists, still means what it meant, and still drives the trend
    sub-page and the Validation column.
  */
  const subjects: LevelSubject[] = people.map((p) => ({
    firstName: p.first_name,
    lastName: p.last_name,
    emailVerified: p.user?.email_verified ?? null,
    tosAcceptedAt: p.user?.tos_accepted_at ?? null,
    phone: p.phone,
    title: p.title,
    hasProfile: !!p.requesterProfile || !!p.providerProfile,
    companyTaxType: p.company?.tax_type ?? null,
    companyTin: p.company?.tin ?? null,
    companyRegisteredAddress: (p.company?.sites?.[0]?.addresses?.length ?? 0) > 0,
    payoutMethodCount: p.payoutMethods.length,
  }));
  const levelTotals = levelCounts(subjects);
  /** Per-person level, by row, so the grid and the tiles cannot disagree. */
  const levelByPerson = new Map(people.map((p, i) => [p.id, subjects[i]]));

  const buyers = people.filter((p) => p.is_service_buyer).length;
  const providers = people.filter((p) => p.is_service_provider).length;
  const coordinators = people.filter((p) => p.is_service_coordinator).length;
  const support = people.filter((p) => p.is_support).length;
  /* `E255` — Requester = owns a RequesterProfile, per `lib/me.ts`. */
  const requesters = people.filter((p) => !!p.requesterProfile).length;

  const d = (v: Date | null | undefined) =>
    v
      ? v.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  /* Read at the moment the query returned, printed by the SERVER — see BoardRefresh. */
  const readAt = new Date().toLocaleTimeString("en-GB");

  const rows = people.slice(0, 50).map((p) => {
    const sides = sidesFor(p);
    const u = p.user;

    /*
      ⚠ ONE CELL PER SIDE, JOINED. "Buyer: In-Process · Seller: Complete" is the
      honest rendering of a dual-role account; a single badge would be a guess.
    */
    const statusCell =
      sides
        .map((side) => {
          const st =
            side === "BUYER"
              ? buyerStatus(p.requesterProfile)
              : sellerStatus(p.providerProfile);
          /* `E253` — the STEP only matters while they are stuck on one. */
          const step =
            side === "BUYER" && st === "In-Process" && p.requesterProfile
              ? ` (${p.requesterProfile.onboarding_step})`
              : "";
          return `${side === "BUYER" ? "Buyer" : "Seller"}: ${st}${step}`;
        })
        .join(" · ") || "—";

    /*
      ⚠ THE LOCK CELL CARRIES THE ATTEMPT COUNT AND THE EXPIRY (`E252a`), because
      "locked" alone does not tell an admin whether to intervene: a lock that
      lifts by itself in 20 minutes and an indefinite admin lock look identical
      without it.
    */
    const lockCell = u?.locked
      ? u.locked_until
        ? `Locked until ${u.locked_until.toLocaleTimeString("en-GB")} (${u.failed_login_attempts})`
        : `Locked — indefinite (${u.failed_login_attempts})`
      : u?.failed_login_attempts
        ? `${u.failed_login_attempts} failed`
        : "—";

    /*
      ⚠ `E270` / `E255` — validation, and `validation_requested_at` so Scott can
      see WHO HAS BEEN WAITING. The buyer side prints its status too, and it will
      read NOT_REQUESTED for everybody because nothing sets it. That is the point:
      the status is rendered, the mechanism is not built.
    */
    const validationCell = p.providerProfile
      ? `${p.providerProfile.validation_status}${
          p.providerProfile.validation_requested_at
            ? ` — asked ${d(p.providerProfile.validation_requested_at)}`
            : ""
        }`
      : p.requesterProfile
        ? p.requesterProfile.validation_status
        : "—";

    return [
      <span key="n">
        <span className="font-semibold">
          {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(unnamed)"}
        </span>
        {p.company?.name && (
          <span className="block text-[12.5px] text-ink-2">{p.company.name}</span>
        )}
      </span>,
      u?.email ?? "—",
      /* `E255` — Requester is now a real row value, not "unknown". */
      [
        p.is_service_coordinator && "Recruiter",
        p.is_service_provider && "Provider",
        !!p.requesterProfile && "Requester",
        p.is_service_buyer && !p.requesterProfile && "Buyer",
      ]
        .filter(Boolean)
        .join(" · ") || "—",
      statusCell,
      u?.email_verified ? d(u.email_verified) : "No",
      lockCell,
      d(u?.last_login),
      validationCell,
    ] as React.ReactNode[];
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <BoardRefresh readAt={readAt} />

      {/*
        ── ⚠⚠ FIVE LIFECYCLE TILES, NOT FOUR WIZARD STATUSES (WS-5b) ──────────

        **SCOTT, 2026-09-12:** *"replace the four wizard-status tiles with FIVE
        lifecycle tiles (verified -> user -> company -> payee, plus total).
        Counts cumulative so the drop-off between stages is visible."*

        ⚠ SUPERSEDED, quoted not deleted — the strip this replaces, which mapped
        `ONBOARDING_STATUSES` and linked each tile to the trend sub-page:
          THE PROGRESSION STRIP (`E256`) — one tile per status, in Scott's order,
          with a live count.
          <TileRow tiles={ONBOARDING_STATUSES.map((s) => ({ label: s,
            value: counts.get(s) ?? 0,
            href: `…/trend?status=${encodeURIComponent(s)}&period=month`,
            hint: s === "Created" ? "No profile yet" : … }))} />

        ⚠⚠ THE NEW TILES CARRY NO `href`, AND THAT IS DELIBERATE. The trend page
        takes `?status=` from `ONBOARDING_STATUSES`; a Level 2 tile pointing at
        it would ask for a status that does not exist and quietly render the
        wrong series. The trend sub-page is out of scope here, so the link stays
        in the caption below, where it is still true.
        ⚠ THE PER-SIDE COUNTS ARE NOT DELETED — `counts` and `sideTotal` still
        feed that caption, and the Validation column still reads the per-side
        statuses. Neither model is renamed.
      */}
      <TileRow
        tiles={LEVEL_TILES.map((t) => ({
          label: t.label,
          value: levelTotals[t.level] ?? 0,
          hint: t.hint,
        }))}
      />
      <p className="mt-2 mb-6 text-[12.5px] text-ink-2">
        The lifecycle, counted per PERSON and cumulative — each stage includes
        everyone past it, so the drop-off between two stages is the gap between
        two tiles. Levels 2 and 3 are unbuilt, so a low count there is an honest
        gap rather than a bug. <b>{people.length}</b> people. The wizard statuses
        are a different model, counted per SIDE ({sideTotal} sides), and{" "}
        <Link
          href="/admin/buyers-sellers/trend?status=all&period=month"
          className="font-semibold text-magenta hover:underline"
        >
          they keep their own trend
        </Link>
        .
      </p>

      <Listing
        title="Buyers / Sellers"
        columns={[
          "Person - Company",
          "Email",
          "Role",
          "Onboarding Status",
          "Verified",
          "Lock / Failed",
          "Last Login",
          "Validation",
        ]}
        rows={rows}
        empty={<StubEmpty what="people" why="Nobody has signed up yet." />}
      />

      <VolumeFooter
        tiles={[
          { label: "Service Requesters", value: requesters },
          { label: "Buyers", value: buyers },
          { label: "Coordinators", value: coordinators },
          { label: "Providers", value: providers },
          { label: "Total", value: people.length },
        ]}
      />
      <p className="mt-3 text-[12.5px] text-ink-2">
        Service Requesters is a real count now — derived as &quot;owns a
        RequesterProfile&quot;, the same expression <code>lib/me.ts</code> uses
        for <code>roles.isRequester</code>. <code>USER_CLASS</code> /{" "}
        <code>USER_JOB</code> are still not in the schema. Support accounts:{" "}
        {support}. Showing the {Math.min(50, people.length)} most recent of{" "}
        {people.length}.
      </p>
    </div>
  );
}
