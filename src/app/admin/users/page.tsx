import { Fragment } from "react";
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
  blockingFor,
  type LevelSubject,
  PROVIDER_ROAD as LIFECYCLE,
  LIFECYCLE_WHO,
  lifecycleStatus,
} from "@/lib/user-levels";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { ResendVerification } from "@/components/admin/ResendVerification";
import {
  ClipboardList, ShoppingCart, UserSearch, Briefcase, ShieldCheck,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { JOB_TILES, holdsJob, jobLabel } from "@/lib/user-jobs";
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
      companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true }, take: 1 },
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
          _count: { select: { serviceProducts: { where: { status: "PUBLISHED" } } } },
          status: true,
          validation_status: true,
          validation_requested_at: true,
          validated_at: true,
          onboarding_completed_at: true,
          completeness: true,
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
  // Lifecycle: each real person is in the box of their status (Registered … Paid).
  const companyIds = [...new Set(people.map((p) => p.companyMemberships[0]?.company_id).filter((x): x is string => !!x))];
  const SIGNED = ["ACCEPTED", "RELEASED", "ACTIVE", "CLOSED", "ON_HOLD", "FINALLY_CLOSED"] as const;
  const [cos, orders, payoutsPaid] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true, legal_name: true, tin: true, tax_form_uploaded_at: true, p_account_id: true, _count: { select: { payoutMethods: true } }, memberships: { where: { status: "APPROVED" }, select: { person_id: true } } } }),
    prisma.workOrder.findMany({ where: { status: { in: [...SIGNED] } }, select: { buyer_person_id: true, provider_person_id: true } }),
    prisma.providerPayout.findMany({ where: { paid_at: { not: null } }, select: { provider_person_id: true } }),
  ]);
  const [proposers, requesters] = await Promise.all([
    prisma.proposal.findMany({ where: { submitted_at: { not: null } }, select: { provider_person_id: true }, distinct: ["provider_person_id"] }),
    prisma.settlementRequest.findMany({ where: { submitted_at: { not: null } }, select: { provider_person_id: true }, distinct: ["provider_person_id"] }),
  ]);
  const proposed = new Set(proposers.map((x) => x.provider_person_id));
  const requested = new Set(requesters.map((x) => x.provider_person_id));
  const paidAccounts = new Set((await prisma.payment.findMany({ where: { p_account_id: { in: cos.map((c) => c.p_account_id) } }, select: { p_account_id: true } })).map((x) => x.p_account_id));
  const coById = new Map(cos.map((c) => [c.id, c]));
  const signedPeople = new Set(orders.flatMap((o) => [o.buyer_person_id, o.provider_person_id]));
  const paidPeople = new Set(payoutsPaid.map((x) => x.provider_person_id));
  const pathIndex = new Map<string, number>();
  for (const p of people) {
    const co = coById.get(p.companyMemberships[0]?.company_id ?? "") ?? null;
    const members = co ? co.memberships.map((m) => m.person_id) : [p.id];
    // Everyone on the provider road's 9 boxes; for buyers, Sell and Request Payment don't apply and count as passed.
    const prov = p.is_service_provider;
    const contract = members.some((id) => signedPeople.has(id));
    const st = lifecycleStatus({
      verify: !!p.user?.email_verified,
      profile: prov ? (p.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD : !!p.requesterProfile?.completed_at,
      link: !!co,
      list: prov ? (p.providerProfile?._count.serviceProducts ?? 0) > 0 || proposed.has(p.id) : true,
      validate: !!co && !!(co.legal_name ?? co.name)?.trim() && !!co.tin?.trim() && !!co.tax_form_uploaded_at && (!prov || co._count.payoutMethods > 0),
      contract,
      request: prov ? members.some((id) => requested.has(id)) : contract,
      paid: members.some((id) => paidPeople.has(id)) || (!!co && paidAccounts.has(co.p_account_id)),
    }, LIFECYCLE);
    pathIndex.set(p.id, st.current - 1);
  }
  const BOXES = LIFECYCLE.map((s, i) => ({ key: String(i + 1), label: s.status, hint: i < LIFECYCLE.length - 1 ? `Next: ${LIFECYCLE[i + 1].step}` : "Every step done" }));
  const boxCounts = BOXES.map((_, i) => realPeople.filter((p) => pathIndex.get(p.id) === i).length);
  const reached = (i: number) => realPeople.filter((p) => (pathIndex.get(p.id) ?? 0) >= i).length;
  const rates = BOXES.map((_, i) => (i >= LIFECYCLE.length - 1 || !reached(i) ? null : Math.round((reached(i + 1) / reached(i)) * 100)));
  const profileDoneAt = (p: (typeof people)[number]) => p.providerProfile?.onboarding_completed_at ?? p.requesterProfile?.completed_at ?? null;
  // When the person reached the step they're on (best available date).
  const enteredAt = (p: (typeof people)[number]): Date => {
    const i = pathIndex.get(p.id) ?? 0;
    return (i === 1 ? p.user?.email_verified : i === 2 ? profileDoneAt(p) ?? p.user?.email_verified : null) ?? p.created_at;
  };
  const daysStuck = (p: (typeof people)[number]) => Math.floor((now - enteredAt(p).getTime()) / DAY);
  const since = period ? now - period * DAY : 0;
  const movedOn: Record<number, number> = {
    0: realPeople.filter((p) => p.user?.email_verified && p.user.email_verified.getTime() >= since).length,
    1: realPeople.filter((p) => { const d = profileDoneAt(p); return !!d && d.getTime() >= since; }).length,
  };
  const oldestWaiting = Math.max(0, ...realPeople.filter((p) => pathIndex.get(p.id) === 0).map(daysStuck));
  const drop = rates.reduce<{ i: number; r: number } | null>((m, r, i) => (r === null ? m : !m || r < m.r ? { i, r } : m), null);

  // A box opens the people CURRENTLY at that step.
  const stageBox = BOXES.find((b) => b.key === sp.stage) ?? null;
  const stageTile = stageBox ? { label: stageBox.label, hint: stageBox.hint, level: stageBox.key } : null;
  const isDrillIn = !!stageTile;

  const staged = stageTile
    ? stageTile.level === "TOTAL"
      ? people
      : people.filter((p) => !p.user?.is_test && pathIndex.get(p.id) === Number(stageTile.level) - 1)
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
          /** The USER id as well as the PERSON id — Scott pastes either, and a */
          p.user_id ?? "",
          jobLabel(p),
          isTest ? "test" : "real",
        ];
        return haystack.some((v) => (v ?? "").toString().toLowerCase().includes(q));
      });

  // THE FIVE JOBS
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

  // NO MORE `slice(0, 50)` WS-2)
  const rows = visible.map((p) => {
    const u = p.user;
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(unnamed)";
    const isTest = p.user?.is_test === true;
    const subject = levelByPerson.get(p.id)!;
    const level = LIFECYCLE[pathIndex.get(p.id) ?? 0].status;
    const blocking = blockingFor(subject);

    // THE RULE MOVED TO `lib/user-jobs.ts` , UNCHANGED. A second
    const roles = jobLabel(p);

    // THE LOCK CELL LOST ITS SENTENCE AND KEPT ITS FACTS . Scott's
    const lockTitle = u?.locked
      ? u.locked_until
        ? `Locked until ${u.locked_until.toLocaleTimeString("en-GB")} — ${u.failed_login_attempts} failed attempts`
        : `Locked indefinitely — ${u.failed_login_attempts} failed attempts`
      : u?.failed_login_attempts
        ? `Not locked — ${u.failed_login_attempts} failed attempts`
        : "Not locked";

    // Validation cell, and the note that came with them

    // THE NAME LINKS ONLY WHERE THERE IS A PAGE TO LINK TO. Scott's spec says
    // EVERY NAME LINKS NOW
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
        // IT LOOKED EXACTLY LIKE THE PLAIN TEXT
        <span key="name" className="inline-flex items-center gap-2">
          <Link
            href={profileHref}
            className="font-semibold text-magenta-ink underline decoration-magenta-ink/30 underline-offset-2 hover:text-magenta-ink-hover hover:decoration-magenta-ink"
          >
            {name}
          </Link>
          {/* THE `TEST` CHIP . Scott's trigger for this whole */}
          {isTest && (
            <span className="rounded-full border border-ink-3 px-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-2">
              Test
            </span>
          )}
        </span>
      ),
      roles,
      // USER-ID IS TRUNCATED, DISPLAY ONLY
      <span
        key="email"
        title={u?.email ?? undefined}
        className="block max-w-[230px] truncate"
      >
        {u?.email ?? "—"}
      </span>,
      u?.email_verified ? d(u.email_verified) : "No",
      <span key="level" className="inline-block border border-[#5C6485] bg-[#5C6485] text-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em]" title={blocking.join(", ") || undefined}>{LIFECYCLE[pathIndex.get(p.id) ?? 0].status}</span>,
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

    // THE SEARCH AND SORT METADATA (WS-2)
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
        // THE LEVEL SORTS BY PROGRESSION, NOT ALPHABETICALLY — "Company"
        pathIndex.get(p.id) ?? 0,
        u?.locked ? 1 : 0,
      ],
    };

    return { cells, meta };
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <BoardRefresh readAt={readAt} />

      {/* THE TEST-ACCOUNT PANEL SITS IN THE MAIN BODY */}
      {/* SEARCH + EXPORT */}
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
        {/* The current filter rides along, or searching would silently drop it. */}
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

      {/* THE SUB-PAGE HEADER , the Medlinq pattern Scott pointed at. */}
      {stageTile && (
        <div className="mb-4">
          <BackLink href="/admin/users" label="Users" />
          <h1 className="mt-1 font-display text-[26px] font-bold text-ink">
            {stageTile.label}
          </h1>
          <p className="mt-1 text-[13px] text-ink-2">
            {stageTile.hint}. People at this step now, longest stuck first. Test accounts excluded.
          </p>
        </div>
      )}

      {/* FIVE LIFECYCLE TILES, NOT FOUR WIZARD STATUSES (WS-5b) */}
      {/* WS-7 — the icons are supplied HERE, which is what opts this one page */}
      {/* THE TILE ROW DISAPPEARS ON THE DRILL-IN — Medlinq shows no */}
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
          <ol className="mt-3 flex flex-col gap-1 md:flex-row md:items-stretch md:gap-0">
            {BOXES.map((b, i) => (
              <Fragment key={b.key}>
                <li className="min-w-0 md:flex-1">
                  <a href={`?stage=${b.key}`} data-box={b.key} className="block h-full border border-ink bg-surface p-2.5 hover:bg-surface-hover" style={{ borderTop: "4px solid #5C6485" }}>
                    <span className="block truncate text-[10.5px] font-bold tracking-[0.08em] text-ink-3">STEP {i + 1} · {LIFECYCLE[i].step.toUpperCase()}</span>
                    <b className="block text-[28px] leading-tight" data-box-count>{boxCounts[i]}</b>
                    <span className="block text-[13.5px] font-bold">{b.label}</span>
                    <span className="block text-[12px] text-ink-2">{b.hint}</span>
                    <span className="mt-1.5 block text-[12px] text-ink-3">
                      {i === 0
                        ? <span className={oldestWaiting > 7 ? "font-semibold text-[#b26b00]" : ""}>oldest: {oldestWaiting} days</span>
                        : movedOn[i] !== undefined
                          ? `${movedOn[i]} moved on ${period ? `in ${period} days` : "all time"}`
                          : "—"}
                    </span>
                  </a>
                </li>
                {i < LIFECYCLE.length - 1 && (
                  <li aria-hidden data-pass={rates[i] ?? ""} className="flex shrink-0 items-center justify-center py-0.5 text-[11.5px] font-bold text-ink-2 md:w-[30px] md:flex-col md:py-0">
                    <span className="md:hidden">↓&nbsp;</span>
                    <span className="max-md:hidden">→</span>
                    <span>{rates[i] === null ? "—" : `${rates[i]}%`}</span>
                  </li>
                )}
              </Fragment>
            ))}
          </ol>
          <p className="mt-2 text-[12.5px] text-ink-2" data-progression-total>
            <b className="text-ink">{realPeople.length}</b> users · the boxes add up to this
            {drop && <> · Biggest drop: {BOXES[drop.i].label} → {BOXES[drop.i + 1].label} ({drop.r}%)</>}
          </p>
        </section>
      )}
      {/* THE EXPLANATORY PARAGRAPH IS GONE */}
      {/* SCOTT'S COLUMN ORDER, VERBATIM (WS-3) */}
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
                      <td className="px-3 py-2 text-right">{stageTile?.level === "1" && p.user_id ? <ResendVerification userId={p.user_id} /> : null}</td>
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
        // — Scott: *"change Buyers/Sellers to Users."* The route keeps
        // — the card heading repeats the tile's label with its count
        title="Users"
        columns={[
          "Picture",
          "Name",
          "Role",
          "User-ID",
          "Verified",
          "Status",
          "Locked",
          // SCOTT: *"i did not ask for validation."* And on the walk
          // HONESTLY: *"Add COMPANY if there is room."* MEASURED at a 1440px
        ]}
        rows={rows.map((r) => r.cells)}
        // THE OPT-IN. `rowMeta` is what promotes this one listing to the
        rowMeta={rows.map((r) => r.meta)}
        searchPlaceholder="Search people, email or company…"
        // SEVEN, AND THE POINT IS THE FOLD
        pageSize={7}
        pageSizeOptions={[7, 15, 25, 50]}
        // SCOPED TO THIS GRID. A second listing that opts in later gets its own
        pageSizeKey="panameer.admin.users.pageSize"
        empty={<StubEmpty what="people" why="Nobody has signed up yet." />}
      />
      )}

      {/* FIVE JOBS, AND ONE OF THE LABELS WAS A LOCK VIOLATION */}
      {!isDrillIn && (
        <>
          <VolumeFooter
            title="By job"
            tiles={JOB_TILES.map((t, i) => ({
              label: t.label,
              value: jobCounts[t.key] ?? 0,
              /* FIVE HUES, NOT A RAMP — five different jobs, not one funnel. */
              tone: t.tone,
              icon: [
                <ClipboardList key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <ShoppingCart key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <UserSearch key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <Briefcase key="i" className="h-[16px] w-[16px]" aria-hidden />,
                <ShieldCheck key="i" className="h-[16px] w-[16px]" aria-hidden />,
              ][i],
              // WS-7 — THIS IS WHERE THE TREND LINK WENT. A new
              href: `/admin/users/trend?job=${t.key}`,
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
