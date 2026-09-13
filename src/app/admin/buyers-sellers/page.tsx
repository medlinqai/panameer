import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  TileRow,
  Listing,
  VolumeFooter,
  StubEmpty,
} from "@/components/console/ConsolePage";
import { BoardRefresh } from "@/components/admin/BoardRefresh";
/*
  ── ⚠⚠ THE PER-SIDE ONBOARDING IMPORTS WENT WITH THE PARAGRAPH (`E457`) ──────

  ⚠ SUPERSEDED, quoted not deleted (`E164`):
    import { ONBOARDING_STATUSES, buyerStatus, sellerStatus, sidesFor,
             type OnboardingStatus } from "@/lib/onboarding-status";

  ⚠⚠ THIS IS WHAT MADE `E457` NOT A ONE-LINE DELETE, and it is bigger than the
  brief expected. The deleted paragraph was the ONLY reader of `sideTotal`, and
  `sideTotal` was the only reason the per-side counting loop ran at all — the
  `counts` Map it filled was read nowhere else on this page (its one other
  mention is inside a SUPERSEDED comment). So the sentence, the loop and these
  five imports all die together; leaving any of them would be a new lint warning
  and the rule is 0 new.
  ⚠ `lib/onboarding-status.ts` ITSELF IS UNTOUCHED and still has 86 references
  across the app, including the `?status=` trend view. Only THIS page stopped
  importing it.
*/
import {
  LEVEL_TILES,
  USER_LEVELS,
  levelCounts,
  levelFor,
  hasReached,
  type UserLevel,
  blockingFor,
  type LevelSubject,
} from "@/lib/user-levels";
import {
  Users, MailCheck, UserCheck, Building2, Wallet,
  ClipboardList, ShoppingCart, UserSearch, Briefcase, ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { JOB_TILES, holdsJob, jobLabel } from "@/lib/user-jobs";
import { LevelPill } from "@/components/console/LevelPill";
import { BackLink } from "@/components/console/BackLink";
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
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const sp = await searchParams;
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
          /* ⚠ `E456` — the Administrators tile's flag. A DIFFERENT AXIS from
             the four marketplace jobs: an access flag, not a job, so somebody
             can be an Administrator AND a Provider. */
          is_system_admin: true,
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
      /*
        ⚠⚠ THE RECORD THAT SEPARATES A BUYER FROM A REQUESTER (`P1-A1.5-E444`).
        `E421` gave a buyer BOTH profiles, so `requesterProfile` alone stopped
        answering "which job is this?". `requester-onboarding.ts` writes this one
        ONLY when the person answered "buyer" at the fork.
      */
      buyerProfile: { select: { id: true } },
      providerProfile: {
        select: {
          /* ⚠ `E430` — the id is what `/providers/[id]` links to. */
          id: true,
          status: true,
          validation_status: true,
          validation_requested_at: true,
          validated_at: true,
        },
      },
    },
  });

  /*
    ⚠⚠ SUPERSEDED, QUOTED NOT DELETED (`E164` / `E457`) — the per-side counting
    loop, which existed only to feed the sentence `E457` removed:

      THE PROGRESSION COUNTS (`E256`).
      ⚠ COUNTED PER SIDE, NOT PER PERSON. A dual-role account holds a status on
      each side, so the tiles total more than the headcount...
      const counts = new Map<OnboardingStatus, number>(
        ONBOARDING_STATUSES.map((s) => [s, 0]));
      let sideTotal = 0;
      for (const p of people) {
        for (const side of sidesFor(p)) {
          const st = side === "BUYER" ? buyerStatus(p.requesterProfile)
                                      : sellerStatus(p.providerProfile);
          counts.set(st, (counts.get(st) ?? 0) + 1);
          sideTotal++; } }

    ⚠ THE PER-SIDE MODEL IS NOT DEAD — it still drives `/trend?status=` and the
    per-side statuses in `onboarding-status.ts`. It simply has no reader on THIS
    page any more, and an unread loop over 199 people is work nobody asked for.
  */

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

  /*
    ── ⚠⚠ EVERY HEADER TILE OPENS A LISTING (`P1-A1.5-E455`) ──────────────────

    > **SCOTT:** *"can you make it so every tile clicks into a report listing all
    > of the users for that status?"* → *"Like medlinq — notice that the sub page
    > has a header in the upper left that allows the user to go back."*

    ⚠ SAME ROUTE + A QUERY PARAM, which is the whole reason search, sort and the
    pager keep working without being rebuilt. `/admin/buyers-sellers?stage=User`.

    ⚠⚠ `?stage=` IS A NEW PARAMETER AND IT DOES NOT TOUCH `?status=`. They are
    different models: `?status=` on `/trend` reads `ONBOARDING_STATUSES` (a
    per-SIDE wizard state) while `?stage=` reads `USER_LEVELS` (a per-PERSON
    capability). Part A left the tiles unlinked precisely because pointing a
    Level 2 tile at `?status=` would have asked for a status that does not exist
    and silently rendered the wrong series. Two axes, two parameters, no overlap.

    ⚠ CUMULATIVE, MATCHING THE TILES. `hasReached` is the SAME expression
    `levelCounts` uses for the tile numbers, so a tile reading 176 opens a list
    of 176 — a second filter here is how a count and its list start disagreeing.
  */
  const stageTile =
    LEVEL_TILES.find((t) => t.level === sp.stage) ?? null;
  const isDrillIn = !!stageTile;

  const visible = stageTile
    ? stageTile.level === "TOTAL"
      ? people
      : people.filter((p) =>
          hasReached(levelByPerson.get(p.id)!, stageTile.level as UserLevel)
        )
    : people;

  /*
    ── ⚠⚠ THE FIVE JOBS (`P1-A1.5-E456`) ─────────────────────────────────────

    ⚠ COUNTED WITH `holdsJob`, WHICH ASKS EACH TILE'S QUESTION INDEPENDENTLY.
    A dual-role person answers yes twice and IS COUNTED TWICE — no first-match,
    which is the exact defect `E444` existed to remove. The caption says so.
    ⚠ `Requesters` NOW USES THE GRID'S OWN RULE (`jobsFor`), not "owns a
    RequesterProfile". ⚠ SUPERSEDED, quoted not deleted:
      const requesters = people.filter((p) => !!p.requesterProfile).length;
    That counted 45 because `E421` gives a BUYER both profiles; the job rule
    counts 38, which is the number the brief measured and the number the Role
    column in the grid below already prints. One rule, two surfaces.
  */
  const adminFlagsFor = (p: (typeof people)[number]) => ({
    isSystemAdmin: p.user?.is_system_admin ?? false,
    isSupport: p.is_support,
  });
  const jobCounts = Object.fromEntries(
    JOB_TILES.map((t) => [
      t.key,
      people.filter((p) => holdsJob(t.key, p, adminFlagsFor(p))).length,
    ])
  ) as Record<string, number>;
  /* For the caption: these do NOT partition the population. */
  const dualRole = people.filter(
    (p) => jobLabel(p).includes(" · ")
  ).length;
  const noJob = people.filter((p) => jobLabel(p) === "—").length;

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

  /*
    ── ⚠⚠ NO MORE `slice(0, 50)` (`P1-A1.5-E430` WS-2) ────────────────────────

    ⚠ SUPERSEDED, quoted not deleted: `people.slice(0, 50).map(...)`.
    That single expression is why Scott *"could not see half of them"* — 199
    people, 50 rendered, no pager and no total. Every row is handed to the grid
    now and the pager decides what is on screen, so NO RECORD IS UNREACHABLE.
  */
  const rows = visible.map((p) => {
    const u = p.user;
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(unnamed)";
    const subject = levelByPerson.get(p.id)!;
    const level = levelFor(subject);
    const blocking = blockingFor(subject);

    /*
      ⚠ THE RULE MOVED TO `lib/user-jobs.ts` (`E460`), UNCHANGED. A second
      surface — `/admin/users/[id]` — needs the same answer, and the brief is
      explicit: *"Do not re-derive this. Import the grid's rule or the grid and
      the page will drift."* Two copies of "is this person a Buyer?" is exactly
      how the badge and this grid disagreed before `E444`.
    */
    const roles = jobLabel(p);

    /*
      ⚠ THE LOCK CELL LOST ITS SENTENCE AND KEPT ITS FACTS (`E252a`). Scott's
      spec says LOCKED is *"a checkbox"*, so the state is the checkbox and the
      attempt count and expiry — which are what tell an admin whether to
      intervene — move into its title. A lock that lifts itself in 20 minutes
      and an indefinite admin lock still have to be distinguishable.
      ⚠ IT IS `disabled`, DELIBERATELY: locking and unlocking is an ACTION and
      this brief builds none. A live checkbox would promise one.
    */
    const lockTitle = u?.locked
      ? u.locked_until
        ? `Locked until ${u.locked_until.toLocaleTimeString("en-GB")} — ${u.failed_login_attempts} failed attempts`
        : `Locked indefinitely — ${u.failed_login_attempts} failed attempts`
      : u?.failed_login_attempts
        ? `Not locked — ${u.failed_login_attempts} failed attempts`
        : "Not locked";

    /*
      ⚠ SUPERSEDED, quoted not deleted (`E446`) — the two locals that fed the
      Validation cell, and the note that came with them:
        *"`E270` / `E255` — validation stays its OWN column, on Scott's
        instruction 2026-09-12."*
        const validation = p.providerProfile ? p.providerProfile.validation_status
          : p.requesterProfile ? p.requesterProfile.validation_status : "—";
        const validationAsked = p.providerProfile?.validation_requested_at
          ? ` — asked ${d(p.providerProfile.validation_requested_at)}` : "";
      ⚠ THAT INSTRUCTION WAS REVERSED THE SAME DAY: *"i did not ask for
      validation."* The columns they fed are gone, so the locals go with them —
      an unused local is a new lint warning, and the rule is 0 new.
      ⚠ THE QUERY STILL SELECTS `validation_status`; 31 other files read it.
    */

    /*
      ⚠⚠ THE NAME LINKS ONLY WHERE THERE IS A PAGE TO LINK TO. Scott's spec says
      *"a hyperlink to that person's profile"*, and `/providers/[id]` is a real
      route — but ONLY providers have one. There is no per-person page for a
      requester or a buyer anywhere in the app, so their name renders as text
      rather than as a link to a 404. ⚠ REPORTED, not papered over.
    */
    /*
      ── ⚠⚠ EVERY NAME LINKS NOW (`P1-A1.5-E460`) ──────────────────────────────

      ⚠ SUPERSEDED, quoted not deleted:
        `const profileHref = p.providerProfile ? `/providers/${p.providerProfile.id}` : null;`
      with the reasoning *"THE NAME LINKS ONLY WHERE THERE IS A PAGE TO LINK TO…
      ONLY providers have one… so their name renders as text rather than as a
      link to a 404."*

      ⚠⚠ THAT WAS RIGHT ABOUT THE REPO AND WRONG ABOUT THE PRODUCT. **SCOTT:**
      *"Everyone has a profile...just sellers have more info on theirs, no?"* —
      and Level 1 proves it: name · email · phone · title · profile · ToS,
      identical on both sides of the marketplace. The answer was not to withhold
      94 links; it was to build the page that was missing. ⚠ ALL 199 ROWS LINK.
      ⚠ `/providers/[id]` IS NOT REPLACED — it is the PUBLIC page, and it now
      hangs off this admin page's Seller detail section.
    */
    const profileHref = `/admin/users/${p.id}`;

    const cells = [
      <Avatar
        key="pic"
        firstName={p.first_name ?? ""}
        lastName={p.last_name ?? ""}
        photoUrl={p.photo_url}
        size={32}
      />,
      (
        /*
          ── ⚠ IT LOOKED EXACTLY LIKE THE PLAIN TEXT (`P1-A1.5-E443`) ──────────

          ⚠ SUPERSEDED, quoted not deleted:
            className="font-semibold text-ink hover:text-magenta hover:underline"
          At REST that is `font-semibold text-ink` — character for character the
          non-linked `<span>` beside it. The link existed and was invisible.

          ⚠ `--color-magenta-ink` (#a61aa5) IS THE TEXT MAGENTA, not the brand
          fill: `globals.css` measures it at 6.34:1 on white where `#d72cd6` is
          4.02:1 and "large & UI only". A grid cell is small text.
          ⚠ AND IT IS STILL MAGENTA-FAMILY ON PURPOSE — `E433` reserves magenta
          for INTERACTIVE things, and this is the one genuinely interactive cell
          in the row.
        */
        <Link
          key="name"
          href={profileHref}
          className="font-semibold text-magenta-ink underline decoration-magenta-ink/30 underline-offset-2 hover:text-magenta-ink-hover hover:decoration-magenta-ink"
        >
          {name}
        </Link>
      ),
      roles,
      /*
        ── ⚠ USER-ID IS TRUNCATED, DISPLAY ONLY (`P1-A1.5-E442`) ───────────────

        MEASURED in `E430`: this column alone took 350px of the 1243px the eight
        columns wanted against a 1058px card, because the test addresses are long
        (`e417.saudi.1789224772447@example.com`).
        ⚠ THE FULL VALUE IS ON HOVER — `title` is enough here: this is an admin
        page on a pointer device, not a touch surface.
        ⚠⚠ SEARCH STILL MATCHES THE WHOLE ADDRESS. `rowMeta.text` below carries
        the untruncated email, so typing any fragment still finds the row — the
        truncation is CSS, never the data.
      */
      <span
        key="email"
        title={u?.email ?? undefined}
        className="block max-w-[230px] truncate"
      >
        {u?.email ?? "—"}
      </span>,
      u?.email_verified ? d(u.email_verified) : "No",
      <LevelPill key="level" level={level} blocking={blocking} />,
      <input
        key="lock"
        type="checkbox"
        checked={!!u?.locked}
        disabled
        aria-label={lockTitle}
        title={lockTitle}
        className="h-4 w-4 accent-magenta"
      />,
    ] as React.ReactNode[];

    /*
      ── ⚠⚠ THE SEARCH AND SORT METADATA (WS-2) ────────────────────────────────

      ⚠ A `ReactNode` CELL CANNOT BE SEARCHED OR COMPARED — `String(<Link/>)` is
      "[object Object]". So the row's searchable text and its per-column sort
      values are built HERE, from the same data the cells came from, and travel
      alongside them. One entry per column, in the same order.
      ⚠ `text` CARRIES MORE THAN THE VISIBLE CELLS: the company and the email are
      both searchable even when the company column scrolls out of view, because
      Scott's actual task was finding which test email ids were free.
    */
    const meta = {
      text: [name, roles, u?.email ?? "", level, p.company?.name ?? ""]
        .join(" ")
        .toLowerCase(),
      sort: [
        /* PICTURE — sorts by whether there IS one, which is a real question. */
        p.photo_url ? 1 : 0,
        name.toLowerCase(),
        roles,
        u?.email ?? null,
        u?.email_verified ? u.email_verified.getTime() : null,
        /* ⚠ THE LEVEL SORTS BY PROGRESSION, NOT ALPHABETICALLY — "Company"
           before "Verified" would be nonsense on a lifecycle column. */
        USER_LEVELS.indexOf(level),
        u?.locked ? 1 : 0,
      ],
    };

    return { cells, meta };
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <BoardRefresh readAt={readAt} />

      {/*
        ⚠ THE SUB-PAGE HEADER (`E455`), the Medlinq pattern Scott pointed at.
        ⚠ SAME COMPONENT AS `E460`'s user page — the brief asks for one
        `BackLink` in both *"or they will diverge"*.
      */}
      {stageTile && (
        <div className="mb-4">
          <BackLink href="/admin/buyers-sellers" label="Users" />
          <h1 className="mt-1 font-display text-[26px] font-bold text-ink">
            {stageTile.label}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {stageTile.hint}. ⚠ Cumulative — everyone who has reached this stage
            or gone past it, which is exactly what the tile counts.
          </p>
        </div>
      )}

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
      {/*
        ⚠ WS-7 — the icons are supplied HERE, which is what opts this one page
        into the Learn-style layout; the other sixteen `TileRow` pages pass none
        and render exactly as before. ⚠ THE HINT IS DROPPED in this layout: the
        Learn tile is two lines, and a third would undo the "thinner" Scott asked
        for. It survives as the label's `title`.
      */}
      {/*
        ⚠ THE TILE ROW DISAPPEARS ON THE DRILL-IN (`E455`) — Medlinq shows no
        tiles on the sub-page, and a strip of five counts above a list of one of
        them invites the reader to compare a number with itself.
      */}
      {!isDrillIn && (
      <TileRow
        tiles={LEVEL_TILES.map((t, i) => ({
          label: t.label,
          value: levelTotals[t.level] ?? 0,
          tone: t.tone,
          /* ⚠ `E455` — every tile opens its own listing. SUPERSEDED, quoted not
             deleted: *"THE NEW TILES CARRY NO `href`, AND THAT IS DELIBERATE."*
             That held only while `?stage=` did not exist. It does now. */
          href: `/admin/buyers-sellers?stage=${encodeURIComponent(t.level)}`,
          icon: [
            <Users key="i" className="h-[19px] w-[19px]" aria-hidden />,
            <MailCheck key="i" className="h-[19px] w-[19px]" aria-hidden />,
            <UserCheck key="i" className="h-[19px] w-[19px]" aria-hidden />,
            <Building2 key="i" className="h-[19px] w-[19px]" aria-hidden />,
            <Wallet key="i" className="h-[19px] w-[19px]" aria-hidden />,
          ][i],
        }))}
      />
      )}
      {/*
        ── ⚠⚠ `E457` · THE EXPLANATORY PARAGRAPH IS GONE ──────────────────────

        > **SCOTT, 2026-09-12:** *"don't need this."*

        ⚠ SUPERSEDED, quoted not deleted (`E164`) — the whole block, because the
        link inside it is the part that mattered:

          <p className="mt-2 mb-6 text-[12.5px] text-ink-2">
            The lifecycle, counted per PERSON and cumulative — each stage
            includes everyone past it... <b>{people.length}</b> people. The
            wizard statuses are a different model, counted per SIDE
            ({sideTotal} sides), and{" "}
            <Link href="/admin/buyers-sellers/trend?status=all&period=month">
              they keep their own trend</Link>.
          </p>

        ⚠⚠ THE PRECONDITION IS ANSWERED. Part 1 STOPPED here rather than delete:
        grepping the tree showed this paragraph was the ONLY entry point to
        `/admin/buyers-sellers/trend`, and stranding a live route to remove a
        sentence was not a call to make unasked. ⚠ SCOTT'S ANSWER: the trend
        hangs off the FOOTER. Each of the five job tiles below now opens
        `/trend?job=<JOB>`, so the route is reachable from FIVE places instead
        of one, and by a link that says what it opens.
        ⚠ NOT a stopgap link, NOT the Reports panel — see `E456` below.
      */}
      {/*
        ── ⚠⚠ SCOTT'S COLUMN ORDER, VERBATIM (WS-3) ───────────────────────────

        ⚠ SUPERSEDED, quoted not deleted — the eight columns this replaces, three
        of which wrapped to two lines and drove the row height to 144px:
          "Person - Company" · "Email" · "Onboarding Status" · "Lock / Failed" ·
          "Last Login" · "Validation"

        ⚠ WHAT CHANGED AND WHY, beyond the order:
        · PICTURE is new — the avatar Medlinq leads with.
        · `Person - Company` SPLIT: NAME is its own column (a link where there is
          a page to link to) and COMPANY moved to the end, which is what Scott
          asked for — *"Add COMPANY if there is room."* Measured: with `nowrap`
          cells the nine columns need more than the card's width, so the pager
          and the horizontal scroller carry it; nothing is clipped.
        · `Last Login` IS GONE. Scott's spec does not include it, and it was the
          column being pushed off the right edge. ⚠ THE DATA IS STILL QUERIED and
          nothing is dropped from the read — restoring the column is one line.
        · LOCKED is a checkbox, per the spec; its attempt count and expiry moved
          into the checkbox's title so no fact was lost.
        · STATUS is the lifecycle pill, and VALIDATION keeps its own column on
          Scott's instruction.

        ⚠ EVERY HEADER IS ONE WORD OR TWO AND NONE WRAPS — `listing-shared.ts`
        sets `whitespace-nowrap`, which is also what makes the scroller engage
        visibly instead of the table silently shrinking to fit.
      */}
      <Listing
        /* ⚠ `E454` — Scott: *"change Buyers/Sellers to Users."* The route keeps
           its name; see the note in `lib/nav.ts`. */
        /* ⚠ `E455` — the card heading repeats the tile's label with its count,
           so the sub-page says what it is listing and how many. */
        title={stageTile ? `${stageTile.label} (${visible.length})` : "Users"}
        columns={[
          "Picture",
          "Name",
          "Role",
          "User-ID",
          "Verified",
          "Status",
          "Locked",
          /*
            ── ⚠⚠ "Validation" IS GONE (`P1-A1.5-E446`) ─────────────────────────

            **SCOTT:** *"i did not ask for validation."* And on the walk:
            *"validation still showing."* His column spec was PICTURE · NAME ·
            ROLE · USER-ID · VERIFIED · STATUS · LOCKED (+ COMPANY if room);
            Validation was chat's addition and `E430` carried it forward.

            ⚠ `validation_status` STAYS IN THE QUERY, deliberately — it has 86
            references across 31 files, including `/account-health`, the
            marketplace card, the admin validate/reject routes and
            `onboarding-status.ts`'s per-side statuses, which still drive the
            trend sub-page. The COLUMN went; the DATA did not.
          */
          /*
            ⚠⚠ "Company" IS NOT HERE, AND THAT IS SCOTT'S OWN CONDITION MET
            HONESTLY: *"Add COMPANY if there is room."* MEASURED at a 1440px
            viewport — the nine columns needed 1428px against a 1058px card, and
            even the eight without Company need 1243px. There is no room, so the
            column that was explicitly conditional is the one that goes.
            ⚠ IT IS STILL SEARCHABLE. `rowMeta.text` carries the company name, so
            typing a company still finds its people — the data did not leave, the
            column did. ⚠ AND THE SORT KEY IS STILL BUILT for it, so restoring
            the column is one line in each of two arrays.
          */
        ]}
        rows={rows.map((r) => r.cells)}
        /*
          ⚠ THE OPT-IN. `rowMeta` is what promotes this one listing to the
          interactive renderer; the other twelve pages pass none and stay
          server-rendered (WS-0, option (c)).
        */
        rowMeta={rows.map((r) => r.meta)}
        searchPlaceholder="Search people, email or company…"
        /*
          ── ⚠⚠ SEVEN, AND THE POINT IS THE FOLD (`P1-A1.5-E458`) ──────────────

          **SCOTT:** *"looks like we need to take the display rows down to 7 with
          the option to change how many return (to show the footer is there)."*

          ⚠ SUPERSEDED, quoted not deleted: `pageSize={15}` — *"I am trying to get
          everything to fit on one page so you can see the footer tiles."* Fifteen
          was the right instruction and the wrong number: MEASURED at 1440×900
          with the banner dismissed, it still pushed the footer below the fold.
          ⚠ THE NUMBER IS NOT THE POINT AND MUST NOT BE TUNED BLIND — it is
          whatever makes the header tiles, the grid and the footer all visible at
          once. The measurement is in the report.
          ⚠ AND IT IS NOW THE VIEWER'S TO CHANGE: the picker remembers 7/15/25/50
          per person, so an admin who would rather scan 50 is one click away.
        */
        pageSize={7}
        pageSizeOptions={[7, 15, 25, 50]}
        /* ⚠ SCOPED TO THIS GRID. A second listing that opts in later gets its own
           key rather than inheriting a size chosen for a different table. */
        pageSizeKey="panameer.admin.users.pageSize"
        empty={<StubEmpty what="people" why="Nobody has signed up yet." />}
      />

      {/*
        ── ⚠⚠ FIVE JOBS, AND ONE OF THE LABELS WAS A LOCK VIOLATION (`E456`) ──

        ⚠ SUPERSEDED, quoted not deleted (`E164`):
          { label: "Service Requesters", value: requesters }   // 45, wrong rule
          { label: "Buyers",  value: buyers }                  // is_service_buyer
          { label: "Coordinators", value: coordinators }       // ⚠⚠ LOCK BREACH
          { label: "Providers", value: providers }
          { label: "Total", value: people.length }             // not a job

        ⚠⚠ `Coordinators` PUT THE DATABASE COLUMN `is_service_coordinator` ON
        SCREEN. `USER_JOB` has been RECRUITER since the naming was locked
        2026-08-02, so this was a violation of that lock rather than a rename.
        ⚠ THE COLUMN IS NOT RENAMED — no schema change, no `db:push`. That is
        `brief_user_class_job_model`'s job and this must not pre-empt it.

        ⚠ `Service Requesters` (45) BECAME `Requesters` (38) because it now uses
        the GRID'S OWN RULE. `E421` gives a buyer BOTH profiles, so "owns a
        RequesterProfile" counted buyers as requesters too. One rule, two
        surfaces — the same reason `E460` moved it into `lib/user-jobs.ts`.
        ⚠ `Total` BECAME `Administrators`: a headcount is not a job, and the
        number it printed is already the `Total Users` tile at the top.

        ⚠ THE `VolumeFooter` COMPONENT IS NOT DELETED OR FORKED — it is the same
        shared component, given five different tiles. It reaches nine other
        pages through `SpecPage`/`StubConsolePage` and none of them change.
        ⚠ IT WAS NOT EMPTY HERE: it already held these five slots. The labels,
        the counts and the links changed; the region did not move.
      */}
      {!isDrillIn && (
        <>
          <VolumeFooter
            title="By job"
            tiles={JOB_TILES.map((t, i) => ({
              label: t.label,
              value: jobCounts[t.key] ?? 0,
              /* ⚠ FIVE HUES, NOT A RAMP — five different jobs, not one funnel. */
              tone: t.tone,
              icon: [
                <ClipboardList key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <ShoppingCart key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <UserSearch key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <Briefcase key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <ShieldCheck key="i" className="h-[16px] w-[16px]" aria-hidden />,
              ][i],
              /* ⚠ `E456` WS-7 — THIS IS WHERE THE TREND LINK WENT. A new
                 parameter on the EXISTING trend route: `?job=`, never
                 `?status=`, because a job handed to the status reader renders
                 the wrong series silently. */
              href: `/admin/buyers-sellers/trend?job=${t.key}`,
              hint: "90-day weekly trend →",
            }))}
          />
          <p className="mt-3 text-[12.5px] text-ink-2">
            ⚠ These five are <b>not a breakdown</b> and do not partition the{" "}
            {people.length} people. A person holding two jobs is counted in{" "}
            <b>both</b> tiles — measured, {dualRole} people do, all of them
            Recruiter · Provider — and {noJob} people hold no job at all because
            they are mid-signup and have not answered the fork yet. ⚠ Naming one
            of them would be the guess <code>E444</code> exists to remove.
            Administrators is a different axis again —{" "}
            <code>is_system_admin</code> / <code>is_support</code>, an access
            flag rather than a marketplace job — so an admin can appear here and
            in another tile too.
          </p>
        </>
      )}
    </div>
  );
}
