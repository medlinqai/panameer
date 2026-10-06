import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TestAccountControls } from "@/components/admin/TestAccountControls";
import {
  Listing,
  VolumeFooter,
  StubEmpty,
} from "@/components/console/ConsolePage";
import { BoardRefresh } from "@/components/admin/BoardRefresh";
import {
  USER_LEVELS,
  levelFor,
  hasReached,
  type UserLevel,
  blockingFor,
  type LevelSubject,
  PROGRESSION,
  currentCounts,
  passRate,
} from "@/lib/user-levels";
import { ResendVerification } from "@/components/admin/ResendVerification";
import {
  ClipboardList, ShoppingCart, UserSearch, Briefcase, ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { JOB_TILES, holdsJob, jobLabel } from "@/lib/user-jobs";
import { LevelPill } from "@/components/console/LevelPill";
import { BackLink } from "@/components/console/BackLink";
import { REGISTERED_SITE_NAME } from "@/lib/company";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; test?: string; q?: string; period?: string }>;
}) {
  const sp = await searchParams;
  const people = await prisma.person.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      user_id: true,
      first_name: true,
      last_name: true,
      created_at: true,
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
      phone: true,
      title: true,
      photo_url: true,
      company: {
        select: {
          name: true,
          tax_type: true,
          tin: true,
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
          is_test: true,
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
      buyerProfile: { select: { id: true } },
      providerProfile: {
        select: {
          id: true,
          status: true,
          validation_status: true,
          validation_requested_at: true,
          validated_at: true,
          onboarding_completed_at: true,
        },
      },
    },
  });

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
  /** Per-person level, by row, so the grid and the tiles cannot disagree. */
  const levelByPerson = new Map(people.map((p, i) => [p.id, subjects[i]]));
  // Progression boxes: real accounts only, each person in exactly one box.
  const DAY = 86_400_000;
  const now = new Date().getTime();
  const period = sp.period === "7" ? 7 : sp.period === "all" ? null : 30;
  const realPeople = people.filter((p) => !p.user?.is_test);
  const realSubjects = realPeople.map((p) => levelByPerson.get(p.id)!);
  const boxCounts = currentCounts(realSubjects);
  const profileDoneAt = (p: (typeof people)[number]) => p.providerProfile?.onboarding_completed_at ?? p.requesterProfile?.completed_at ?? null;
  // When the person reached the step they're stuck at (best available date).
  const enteredAt = (p: (typeof people)[number], level: UserLevel): Date =>
    (level === "Verified" ? p.user?.email_verified : level === "User" ? profileDoneAt(p) ?? p.user?.email_verified : null) ?? p.created_at;
  const daysStuck = (p: (typeof people)[number]) => Math.floor((now - enteredAt(p, levelFor(levelByPerson.get(p.id)!)).getTime()) / DAY);
  const since = period ? now - period * DAY : 0;
  const movedOn: Partial<Record<UserLevel, number>> = {
    Registered: realPeople.filter((p) => p.user?.email_verified && p.user.email_verified.getTime() >= since).length,
    Verified: realPeople.filter((p) => { const d = profileDoneAt(p); return !!d && d.getTime() >= since && hasReached(levelByPerson.get(p.id)!, "User"); }).length,
  };
  const oldestWaiting = Math.max(0, ...realPeople.filter((p) => levelFor(levelByPerson.get(p.id)!) === "Registered").map(daysStuck));
  const rates = PROGRESSION.map((_, i) => passRate(realSubjects, i));
  const drop = rates.reduce<{ i: number; r: number } | null>((m, r, i) => (r === null || i >= 4 ? m : !m || r < m.r ? { i, r } : m), null);

  // R2-E003: a box opens the people CURRENTLY at that step (not everyone who passed it).
  const stageBox = PROGRESSION.find((b) => b.level === sp.stage) ?? null;
  const stageTile = stageBox ? { label: stageBox.label, hint: stageBox.hint, level: stageBox.level as UserLevel | "TOTAL" } : null;
  const isDrillIn = !!stageTile;

  const staged = stageTile
    ? stageTile.level === "TOTAL"
      ? people
      : people.filter((p) => !p.user?.is_test && levelFor(levelByPerson.get(p.id)!) === stageTile.level)
    : people;

  const testFilter = sp.test === "real" || sp.test === "test" ? sp.test : "all";
  const byTest =
    testFilter === "all"
      ? staged
      : staged.filter((p) => (p.user?.is_test === true) === (testFilter === "test"));

  const q = (sp.q ?? "").trim().toLowerCase();
  const visible = !q
    ? byTest
    : byTest.filter((p) => {
        const isTest = p.user?.is_test === true;
        const haystack = [
          p.first_name,
          p.last_name,
          `${p.first_name ?? ""} ${p.last_name ?? ""}`,
          p.user?.email,
          p.company?.name,
          p.title,
          p.phone,
          p.id,
          /** ⚠ The USER id as well as the PERSON id — Scott pastes either, and a
           *  search that silently knows only one of them is the defect above. */
          p.user_id ?? "",
          jobLabel(p),
          isTest ? "test" : "real",
        ];
        return haystack.some((v) => (v ?? "").toString().toLowerCase().includes(q));
      });

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
    const isTest = p.user?.is_test === true;
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
        <span key="name" className="inline-flex items-center gap-2">
          <Link
            href={profileHref}
            className="font-semibold text-magenta-ink underline decoration-magenta-ink/30 underline-offset-2 hover:text-magenta-ink-hover hover:decoration-magenta-ink"
          >
            {name}
          </Link>
          {/*
            ⚠⚠ THE `TEST` CHIP (`P2-ALL-E793`). ⚠ Scott's trigger for this whole
            lane was that his `test2*` accounts had been deleted and **nothing in
            the app showed that**. A chip is the smallest honest answer: which of
            these rows is disposable, visible without opening anything.
            ⚠ Outlined, not filled — it is a label, not a status to celebrate,
            and `E433` reserves magenta fills for interactive things.
          */}
          {isTest && (
            <span className="rounded-full border border-ink-3 px-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
              Test
            </span>
          )}
        </span>
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
        ── ⚠⚠ THE TEST-ACCOUNT PANEL SITS IN THE MAIN BODY (`P2-ALL-E793`) ─────
        ⚠⚠⚠ **NOT INSIDE `{stageTile && …}`.** My first placement went into the
        DRILL-IN header, which renders only when a lifecycle tile is selected —
        so the panel was invisible on the page everyone actually opens, and
        `check:admin-ui` caught it. ⚠ A control that exists only behind a filter
        is a hidden door (the 2026-09-23 card rule).
      */}
      {/*
        ── ⚠⚠ SEARCH + EXPORT (`P2-ALL-E794`) ─────────────────────────────────

        ⚠ A plain `GET` form, server-rendered: no client JavaScript, the query
        stays in the URL so a search is linkable and the browser's back button
        works. ⚠⚠ The Export link carries the SAME `q` and `test`, so the file
        matches the list on screen rather than silently exporting everything.
      */}
      <form method="get" className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[240px]">
          <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-ink-2">
            Search every field
          </span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="name · email · company · job · phone · id · test"
            className="mt-1 min-h-11 w-full border border-line bg-surface px-2 text-[14px] text-ink"
          />
        </label>
        {/* ⚠ The current filter rides along, or searching would silently drop it. */}
        {testFilter !== "all" && <input type="hidden" name="test" value={testFilter} />}
        <button
          type="submit"
          className="inline-flex min-h-11 items-center bg-ink px-3 text-[13px] font-bold text-surface"
        >
          Search
        </button>
        {q && (
          <a
            href={testFilter === "all" ? "?" : `?test=${testFilter}`}
            className="inline-flex min-h-11 items-center text-[13px] font-semibold text-ink-2 underline"
          >
            Clear
          </a>
        )}
        <a
          href={`/api/admin/export?list=users${q ? `&q=${encodeURIComponent(q)}` : ""}${
            testFilter !== "all" ? `&test=${testFilter}` : ""
          }`}
          className="inline-flex min-h-11 items-center border border-ink bg-surface px-3 text-[13px] font-bold text-ink"
        >
          Export to Excel
        </a>
      </form>
      {q && (
        <p className="mt-2 text-[13px] text-ink-2">
          {}
          {visible.length === 0
            ? `No one matches “${q}”. Searched name, email, company, title, job, phone and both ids across ${people.length} people.`
            : `${visible.length} of ${people.length} match “${q}”.`}
        </p>
      )}

      <TestAccountControls filter={testFilter} />

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
            {stageTile.hint}. People at this step now, longest stuck first. Test accounts excluded.
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
        <section data-progression className="mb-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[20px] font-bold">User Progression</h2>
              <p className="text-[13px] text-ink-2">Where every user is right now. Each person is in exactly one box.</p>
            </div>
            <nav className="flex gap-1 text-[12.5px]" aria-label="Period">
              {(["7", "30", "all"] as const).map((k) => {
                const on = (k === "all" ? null : Number(k)) === period;
                return (
                  <a key={k} href={`?period=${k}`} className={"border px-2.5 py-1 font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink-2")}>
                    {k === "all" ? "All Time" : `${k} Days`}
                  </a>
                );
              })}
            </nav>
          </div>
          <ol className="mt-3 grid gap-2 md:grid-cols-[repeat(5,minmax(0,1fr))]">
            {PROGRESSION.map((b, i) => (
              <li key={b.level} className="relative">
                <a href={`?stage=${b.level}`} data-box={b.level} className="block h-full border border-ink bg-surface p-3 hover:bg-surface-hover">
                  <span className="block text-[10.5px] font-bold tracking-[0.1em] text-ink-3">STEP {i + 1}</span>
                  <b className="block text-[28px] leading-tight" data-box-count>{boxCounts[b.level]}</b>
                  <span className="block text-[13.5px] font-bold">{b.label}</span>
                  <span className="block text-[12px] text-ink-2">{b.hint}</span>
                  <span className="mt-1.5 block text-[12px] text-ink-3">
                    {i === 0
                      ? <span className={oldestWaiting > 7 ? "font-semibold text-[#b26b00]" : ""}>oldest: {oldestWaiting} days</span>
                      : movedOn[b.level] !== undefined
                        ? `${movedOn[b.level]} moved on ${period ? `in ${period} days` : "all time"}`
                        : "—"}
                  </span>
                </a>
                {i < 4 && (
                  <span data-pass={rates[i] ?? ""} className="block py-1 text-center text-[12px] font-bold text-ink-2 md:absolute md:-right-2 md:top-1/2 md:z-10 md:-translate-y-1/2 md:translate-x-1/2 md:bg-canvas md:px-1">
                    <span className="md:hidden">↓ </span><span className="max-md:hidden">→ </span>{rates[i] === null ? "—" : `${rates[i]}%`}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[12.5px] text-ink-2" data-progression-total>
            <b className="text-ink">{realPeople.length}</b> users · the five boxes add up to this
            {drop && <> · Biggest drop: {PROGRESSION[drop.i].label} → {PROGRESSION[drop.i + 1].label} ({drop.r}%)</>}
          </p>
        </section>
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
      {isDrillIn ? (
        <div data-stuck-list className="overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-[13.5px]">
            <thead>
              <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                {["Person", "Signed up", "Days stuck", "Last seen", "Left off at", ""].map((h) => (
                  <th key={h} className="px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...visible]
                .sort((x, y) => daysStuck(y) - daysStuck(x))
                .map((p) => {
                  const subj = levelByPerson.get(p.id)!;
                  const leftOff = p.requesterProfile?.onboarding_step ?? blockingFor(subj).join(", ") ?? "—";
                  return (
                    <tr key={p.id} data-stuck-row className="border-b border-line/60">
                      <td className="px-3 py-2">
                        <Link href={`/admin/users/${p.id}`} className="font-semibold text-magenta-ink underline underline-offset-2">
                          {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.user?.email || "(unnamed)"}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{d(p.created_at)}</td>
                      <td className={"px-3 py-2 font-semibold " + (daysStuck(p) > 7 ? "text-[#b26b00]" : "")} data-days-stuck>{daysStuck(p)}</td>
                      <td className="px-3 py-2">{d(p.user?.last_login)}</td>
                      <td className="px-3 py-2 text-ink-2">{leftOff || "—"}</td>
                      <td className="px-3 py-2 text-right">{stageTile?.level === "Registered" && p.user_id ? <ResendVerification userId={p.user_id} /> : null}</td>
                    </tr>
                  );
                })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-ink-2">Nobody is at this step.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <Listing
        /* ⚠ `E454` — Scott: *"change Buyers/Sellers to Users."* The route keeps
           its name; see the note in `lib/nav.ts`. */
        /* ⚠ `E455` — the card heading repeats the tile's label with its count,
           so the sub-page says what it is listing and how many. */
        title="Users"
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
      )}

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
