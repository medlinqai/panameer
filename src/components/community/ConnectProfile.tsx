import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import {
  CompletionRing,
  completionHook,
} from "@/components/community/CompletionRing";
import type { ProviderProfileView } from "@/lib/provider-profile-view";
import type { TaughtPath, TakenPath } from "@/lib/learn-home";
import type { Testimonial } from "@/lib/recommendations";
import type { CommunitySignal } from "@/lib/community-signal";
import type { ProfileScore } from "@/lib/completeness";
import type { MessagePermission } from "@/lib/messages";
import { CommunitySignalBlock } from "@/components/profile/CommunitySignal";
import {
  CertificationsBody,
  EducationBody,
  /* ⚠ ONE EDIT PATTERN (`E593` WS-B item 6) — `EditLink` lives beside
     `EditButton` in `sections.tsx` and shares its `EDIT_CLASS`, so the link and
     the button render identically. ⚠ It was dead code in `ProviderProfileView`
     until this brief; it was MOVED, not copied. */
  EditLink,
  OverviewBody,
  ProfileCard,
  SoloProjectsBody,
  SpecializationsBody,
  WorkHistoryBody,
} from "@/components/profile/sections";
import "./connect-profile.css";

/**
 * ── ⚠⚠ CONNECT HOME IS THE PROFILE (`P2-J3-E588` WS-A, OWNER MODE) ─────────
 *
 * ⚠⚠⚠ SCOTT, 2026-09-19: *"connect is now 'build your profile and connect to
 * other profiles'."* ⚠ `/community` stops being a landing page that links
 * elsewhere and becomes the provider's own profile, in three columns of cards.
 * ⚠ The band's top icons are APPLICATIONS; Connect is one, and this is its home.
 *
 * ── ⚠⚠ WHY THIS IS A NEW COMPONENT AND NOT A REWRITE OF `ProviderProfileView` ─
 *
 * ⚠ WS-A IS OWNER MODE ONLY. `ProviderProfileView` still serves
 * `/providers/[id]`, which is the BUYER-FACING page, and restructuring it now
 * would ship a half-built visitor mode at the WS-A gate.
 * ⚠⚠ SO THERE ARE TWO PROFILE COMPONENTS BETWEEN WS-A AND WS-B, ON PURPOSE.
 * **WS-B converges them** — it adds visitor mode here and repoints
 * `/providers/[id]`, after which `ProviderProfileView` is superseded and quoted
 * (`E164`), never deleted. ⚠ The acceptance criterion *"there is ONE profile
 * component"* is the BRIEF's end state, not WS-A's.
 *
 * ⚠ THE CARD BODIES ARE IMPORTED FROM `sections.tsx`, NOT REWRITTEN. That file
 * is the genuinely shared piece — the `E056` invariant `E562` WS-C relied on —
 * so the onboarding review and this page cannot drift about what a work-history
 * row looks like.
 *
 * ── ⚠⚠ ONE COMPLETENESS SUMMARY ON THE PAGE, NOT TWO ──────────────────────
 *
 * ⚠ The ring REPLACES `E562` WS-A's amber *"Worth adding to your profile"*
 * panel here — both state the same thing and would otherwise render on the same
 * screen. ⚠⚠ **`E562`'s STATUS STRIP IS A DIFFERENT FACT AND IS NOT REPLACED**:
 * the strip is the GATE in words (*"Photo, identity and the required details —
 * all met"*), the ring is the METER. That is `E582`'s own distinction, applied.
 */
/**
 * ── ⚠⚠ NO DIVIDER LINES INSIDE A CARD (`P2-J3-E593` WS-B item 4) ──────────
 *
 * ⚠ Scott, 2026-09-20, on the My Colleagues / Viewing Me card: remove the rule
 * between the rows — *"and others you will see next."*
 * ⚠⚠ SO IT WAS APPLIED TO ALL NINE, NOT JUST THE ONE HE POINTED AT. The card
 * border already groups the rows; a second rule inside it divides what the box
 * has already joined. ⚠ SUPERSEDED, quoted not deleted (`E164`): the rows
 * carried `border-t border-line-2` — as a conditional on `i > 0` in the four
 * list bodies, and inline in the identity, counts and selling cards.
 * ⚠ THE SPACING IS UNCHANGED — only the rule is gone; `py-2`, `mt-3` and `pt-3`
 * all stay, so nothing reflows.
 */
export function ConnectProfile({
  p,
  taughtPaths = [],
  takenPaths = [],
  testimonials = [],
  community = null,
  score = null,
  colleagueCount,
  youBothKnow = null,
  messagePermission = null,
  connect,
}: {
  p: ProviderProfileView;
  taughtPaths?: TaughtPath[];
  /** ⚠ `LearnEnrollment` rows — paths TAKEN, not taught (`E593` WS-B 17). */
  takenPaths?: TakenPath[];
  testimonials?: Testimonial[];
  /**
   * ⚠⚠ FORUM INVOLVEMENT — CARRIED OVER DELIBERATELY, NOT IN THE MOCKUP.
   *
   * ⚠ `/profile` supplied this to `ProviderProfileView` and `/profile` is now a
   * redirect, so without this prop the owner's profile would SILENTLY LOSE a
   * surface that existed yesterday. ⚠⚠ `check:community` GUARD 3 exists to
   * catch exactly that — *"both profile surfaces actually supply it, or the
   * block can never appear"* — and it caught it.
   *
   * ⚠ NULL RENDERS NOTHING, which is today's real answer for every profile on
   * the platform: `community-signal.ts` returns null with 0 threads and 0 posts
   * platform-wide. ⚠⚠ So this costs nothing visually and keeps the guarantee.
   * ⚠ **Reported at the WS-A gate — the brief's card list omits it, and whether
   * Scott wants it on the new page is his call, not a silent deletion.**
   */
  community?: CommunitySignal | null;
  /**
   * ⚠⚠ THE PER-LINE BREAKDOWN, for the completion card (`P2-J3-E590` WS-C).
   * ⚠ OPTIONAL AND OWNER-ONLY BY CONSTRUCTION: the card is inside the
   * `owner` branch, and `/providers/[id]` does not compute or pass it — a
   * visitor's payload never contains somebody else's score.
   * ⚠ `null` renders no card at all rather than a ring of zeroes.
   */
  score?: ProfileScore | null;
  /** ⚠ A REAL COUNT of accepted COLLEAGUE connections. The Counters decision is
   *  locked — *"count it and print it, seeded rows included."* The seeded graph
   *  is small, so the number is small. That is correct, not a bug. */
  colleagueCount: number;
  /**
   * ⚠ VISITOR ONLY — accepted colleagues the viewer and this provider share.
   * A REAL QUERY (`mutualColleagueCount`), unlike `Viewing Me`, which has no
   * data at all. ⚠ `null` on the owner's own page, where the question is
   * meaningless.
   */
  youBothKnow?: number | null;
  /**
   * ⚠⚠ THE MESSAGE VERDICT, READ FROM `canMessage` — THE BUTTON READS THE RULE
   * AND DOES NOT RESTATE IT. ⚠ `canMessage` is BYTE-UNCHANGED by this brief.
   */
  messagePermission?: MessagePermission | null;
  /** ⚠ `ConnectControls`, resolved by the page that knows it is showing
   *  somebody else. Carried over unchanged from `/providers/[id]`. */
  connect?: ReactNode;
}) {
  /*
    ── ⚠⚠⚠ THE SINGLE `isOwner` POINT (`P2-J3-E588` WS-B) ────────────────────

    ⚠⚠ `p.isOwner` IS READ EXACTLY ONCE IN THIS COMPONENT, HERE. Everything
    owner-only downstream keys off `owner`, and everything visitor-only off
    `!owner`. ⚠ That is `E562` WS-A's discipline: one gate, so "is every owner
    affordance absent for a visitor" is answerable by reading one line instead
    of auditing thirty.
    ⚠ **A future edit that reaches for `p.isOwner` again has broken the
    guarantee.** Add to this block instead.
  */
  const owner = p.isOwner;

  const fullName = [p.person.firstName, p.person.lastName]
    .filter(Boolean)
    .join(" ");

  /* ⚠ A SOLO PROJECT IS ONE NO EMPLOYER CLAIMS. ⚠⚠ THE DERIVATION IS COPIED
     FROM `ProviderProfileView.tsx:156` DELIBERATELY, not re-invented — there is
     no `employerId` on the project view type, and the two surfaces must agree
     about which projects are solo. ⚠ WS-B converges these components; this is
     one of the things that converges. */
  const soloProjects = p.projects.filter(
    (pr) => !p.employers.some((e) => (e.projects ?? []).some((n) => n.id === pr.id))
  );


  /*
    ── ⚠⚠ ONE SERVICE-PRODUCTS CARD, TWO POSITIONS AND TWO AFFORDANCES ───────

    ⚠ OWNER sees an inventory with prices and a link to manage them.
    ⚠ VISITOR sees the same rows priced WITH A BUY AFFORDANCE, moved up.

    ⚠⚠⚠ NO PURCHASE FLOW IS BUILT IN THIS BRIEF, AND THE BUTTON SAYS SO RATHER
    THAN PRETENDING. There is no checkout, no cart and no order for a `Package`
    — `WorkOrder` holds zero rows. ⚠ A `Buy` button that silently did nothing
    would be the worst kind of dead control: it looks like the product works.
  */
  const serviceProducts = (
    <ProfileCard title="Service Products">
      {p.packages.length === 0 ? (
        <p className="text-[13.5px] leading-relaxed text-ink-2">
          {owner ? (
            <>
              Nothing listed yet. A service product is what a buyer actually
              buys.{" "}
              <Link
                href="/my-services"
                className="font-bold text-magenta hover:underline"
              >
                Add a Service Product
              </Link>
            </>
          ) : (
            "This provider hasn't listed any service products yet."
          )}
        </p>
      ) : (
        <>
          {!owner && (
            <p className="-mt-1.5 mb-3 text-[13.5px] leading-relaxed text-ink-2">
              Fixed scope, fixed fee.
            </p>
          )}
          <div className="flex flex-col">
            {p.packages.map((pk) => (
              <div
                key={pk.id}
                className={
                  "flex items-center justify-between gap-3.5 py-3" +
                  ""
                }
              >
                <div className="min-w-0">
                  <span className="text-[14.5px] font-bold">{pk.title}</span>
                  {pk.summary && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">
                      {pk.summary}
                    </p>
                  )}
                </div>
                <div className="shrink-0 whitespace-nowrap text-right">
                  {/* ⚠ `E433` — a price is a figure, so ink. */}
                  {pk.priceCents != null && (
                    <b className="text-[14px] tabular-nums text-ink">
                      {money(pk.priceCents, pk.currency)}
                    </b>
                  )}
                  {/* ⚠⚠ THE BUY AFFORDANCE IS DISABLED AND NAMED. Nobody buys
                      their own product, so it is visitor-only; and there is no
                      purchase flow yet, so it refuses rather than misleads. */}
                  {!owner && (
                    <button
                      type="button"
                      disabled
                      title="Buying isn't open yet"
                      className="mt-1.5 block cursor-not-allowed rounded-full bg-line px-4 py-1.5 text-[13px] font-bold text-ink-3"
                    >
                      Buy
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!owner && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              Buying isn&rsquo;t open yet. Connect as a colleague to talk to this
              provider about the work.
            </p>
          )}
        </>
      )}
    </ProfileCard>
  );

  return (
    <div className="pm-cp">
      {/* ═══════════ LEFT RAIL ═══════════ */}
      <aside className="pm-cp-rail-l">
        {/* ── identity ── */}
        <section className="overflow-hidden rounded-brand border border-line bg-white">
          {/* ⚠ The cover is a brand gradient, not an uploaded image — there is
              no cover-image column on `ProviderProfile`, and inventing one is
              not this brief. */}
          <div className="h-[76px] bg-gradient-to-br from-ink via-[#4b2d63] to-magenta-dark" />
          <div className="-mt-[30px] px-[18px] pb-4">
            {/* ⚠ The white ring lifts the photo off the cover gradient. It is a
                WRAPPER because `Avatar` takes no `className` — widening its
                props for one caller is a change to a component six surfaces
                share. */}
            <span className="inline-block overflow-hidden rounded-full ring-[3px] ring-white">
              <Avatar
                firstName={p.person.firstName ?? ""}
                lastName={p.person.lastName ?? ""}
                photoUrl={p.person.photoUrl}
                size={64}
              />
            </span>
            <div className="mt-2 flex items-center gap-1.5">
              <h2 className="font-display text-[18px] font-bold">{fullName}</h2>
              {p.validated && (
                <span title="Validated by Panameer" className="text-magenta">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-label="Validated by Panameer" role="img">
                    <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                    <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                  </svg>
                </span>
              )}
            </div>
            {p.headline && (
              <p className="mt-1 text-[13px] leading-snug text-ink-2">
                {p.headline}
              </p>
            )}
            {p.location && (
              <p className="mt-1 text-[12.5px] text-ink-3">{p.location}</p>
            )}
            {p.person.title && (
              <div className="mt-3 text-[13.5px] font-bold">
                {p.person.title}
              </div>
            )}
          </div>
        </section>

        {/* ── colleagues / viewing me ── */}
        <section className="rounded-brand border border-line bg-white px-[18px] py-4">
          <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
            {owner ? (
              <Link
                href="/community/colleagues"
                className="font-bold text-magenta hover:underline"
              >
                My Colleagues
              </Link>
            ) : (
              /* ⚠ NOT A LINK FOR A VISITOR — `/community/colleagues` is the
                 viewer's OWN colleague list, so linking it from somebody else's
                 profile would promise their list and deliver yours. */
              <span className="font-bold text-ink">Colleagues</span>
            )}
            {/* ⚠ `E433` — a count is a figure, so ink. */}
            <b className="text-ink">{colleagueCount}</b>
          </div>
          {/*
            ⚠⚠⚠ `Viewing Me` HAS NO DATA AND IS NOT INVENTED. There is NO view
            tracking anywhere in this codebase — no `view_count`, no
            `ProfileView` model, nothing writes one. ⚠ The mockup shows `201`;
            that number does not exist and a plausible one would be a fabricated
            fact about a real person's profile.
            ⚠ So it takes the dash convention, with a sentence saying what it is.
          */}
          {owner ? (
            <>
              <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
                <span className="text-ink-2">Viewing Me</span>
                <b className="text-ink-2/40">—</b>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-2">
                Profile views aren&rsquo;t counted yet.
              </p>
            </>
          ) : (
            /* ⚠⚠ THE VISITOR'S SECOND ROW IS A REAL QUERY, unlike `Viewing Me`.
               Accepted colleague edges on both sides — see
               `mutualColleagueCount`. */
            <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
              <span className="text-ink-2">You Both Know</span>
              <b className="text-ink">{youBothKnow ?? 0}</b>
            </div>
          )}
        </section>

        {/*
          ── ⚠⚠⚠ `Companies & Projects` IS GONE (`P2-J3-E593` WS-B item 7) ────

          ⚠ Scott, 2026-09-20, removing it from the walk.
          ⚠⚠ AND IT CLOSES A QUESTION `E588` LEFT OPEN, WHICH IS WHY THIS NOTE IS
          LONGER THAN THE CARD WAS. `Project.client_visibility` is
          `PUBLIC | PLUS_ONLY | CONFIDENTIAL`, and `E588` rendered only `PUBLIC`
          in BOTH modes while recording that *"owner mode could arguably show all
          three"* and that *"what the rule should be is in the WS-A report."*
          ⚠⚠⚠ THE CARD IS THE ONLY SURFACE THAT EVER ASKED THE QUESTION. With it
          gone, `PLUS_ONLY` and `CONFIDENTIAL` have no renderer on this page at
          all, so there is nothing left to rule on here — **the open question is
          CLOSED BY REMOVAL, not by a decision.**
          ⚠ THE COLUMN AND ITS THREE VALUES ARE UNTOUCHED. If a client list ever
          returns to a profile, the safety rule returns with it and is written
          ONCE, as it was here: a `CONFIDENTIAL` client must never reach a
          visitor. ⚠⚠ DO NOT READ THIS AS "confidentiality was settled" — it was
          never settled; the surface that needed it went away.

          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the card, and the
          derivation that fed it:
          //   const publicClients = Array.from(new Set(
          //     p.projects.filter((pr) => pr.clientVisibility === "PUBLIC")
          //       .map((pr) => pr.clientName || pr.employer)
          //       .filter((n): n is string => Boolean(n && n.trim()))
          //   )).slice(0, 6);
          //   <section …><p …>Companies &amp; Projects</p>
          //     {publicClients.length === 0
          //       ? <p …>Nothing to show yet. Clients you mark as public appear here.</p>
          //       : publicClients.map((name) => <div key={name}>…{name}</div>)}
          //   </section>
        */}

        {/*
          ⚠⚠⚠ OWNER-ONLY, AND THIS IS THE WHOLE VISITOR GUARANTEE IN THE LEFT
          RAIL. Selling links and the account utilities are things only the
          person whose profile this is can act on. ⚠ A visitor sees the identity
          card, the two counts and the public clients — and nothing else.
        */}
        {owner && (
          <>
          {/* ── grow your business faster ── */}
          <section className="rounded-brand border border-line bg-white px-[18px] py-4">
            {/* ⚠ `Grow Your Income Faster` (`E593` WS-B item 8). ⚠ SUPERSEDED,
                quoted not deleted (`E164`): it read `Grow your business faster`.
                ⚠⚠ TITLE CASE WITH THE PRONOUN CAPITALISED (`E568`) — `Your` is
                a pronoun, which is the half of that rule most often missed. */}
            <p className="mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
              Grow Your Income Faster
            </p>
            <div className="flex flex-col">
              <Link
                href="/my-services"
                className="py-2 text-[13.5px] font-bold text-magenta hover:underline"
              >
                Sell Service Products
              </Link>
              {/*
                ── ⚠⚠ IT IS A LINK NOW, AND `WS-A` IS WHY (`E593` WS-B item 9) ──

                ⚠ SUPERSEDED, quoted not deleted (`E164`):
                //   ⚠⚠ `Sell Paid Groups` IS PLAIN TEXT, NOT A LINK — the footer rule.
                //   ⚠ THERE IS NO SUCH PAGE. A link to a route that does not exist is
                //   a 404 with a promise attached; the words stay so the intent is
                //   recorded, and they become a link the day the page ships.
                ⚠⚠⚠ THAT DAY IS THIS BRIEF. `E593` WS-A labels the forums route
                `Groups`, so the page it promised now exists and is named — the
                condition the old comment set is met, not waived.
                ⚠ THE PAID HALF IS STILL UNBUILT (`/community/forums` is the free
                forum-per-learning-path of `E383`). ⚠⚠ THE LINK GOES TO THE
                SURFACE, NOT TO A PAYMENT — and the card's heading already frames
                it as an ambition. **Do not fabricate a paid state to match the
                word `Paid`.**
              */}
              <Link
                href="/community/forums"
                className="py-2 text-[13.5px] font-bold text-magenta hover:underline"
              >
                Sell Paid Groups
              </Link>
            </div>
          </section>

          {/* ── owner utility links ── */}
          <section className="rounded-brand border border-line bg-white px-[18px] py-4">
            <div className="flex flex-col">
              {[
                { label: "My Stats", href: "/stats" },
                { label: "My Account Health", href: "/account-health" },
                { label: "My Groups", href: "/community/teams" },
                { label: "My Settings", href: "/settings" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "py-2 text-[13.5px] font-bold text-magenta hover:underline" +
                    ""
                  }
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
          </>
        )}

      </aside>

      {/* ═══════════ CENTRE ═══════════ */}
      <main>
        {/* ⚠⚠ THE HEADING NAMES WHOSE PAGE THIS IS. `My Profile` on somebody
            else's profile is the same class of error as an owner affordance
            leaking — it tells the reader the record is theirs. */}
        <h1 className="mb-3.5 mt-0.5 font-display text-[25px] font-bold">
          {owner ? "My Profile" : fullName}
        </h1>

        <div className="flex flex-col gap-4">
          {/*
            ── ⚠⚠ RATES LEFT THE CENTRE (`P2-J3-E593` WS-B item 14) ──────────

            ⚠ Scott, 2026-09-20: *"Rates moves from the centre to a SIDE card,
            and gains an edit link."* ⚠ It is now in the RIGHT RAIL — see below.
            ⚠⚠ BIO KEEPS THE ROW TO ITSELF AND THE ROW STAYS `pm-cp-two`: the
            grid collapses a single child to full width on its own, and changing
            the class would change the breakpoint behaviour for a card that is
            not moving.
            ⚠ SUPERSEDED, quoted not deleted (`E164`) — the pair as it stood,
            and the two facts the Rates comment carried, which MOVED WITH THE
            CARD rather than being dropped:
            //   <div className="pm-cp-two">
            //     <ProfileCard title="Bio">…</ProfileCard>
            //     <ProfileCard title="Rates"><RateRows p={p} /></ProfileCard>
            //   </div>
          */}
          <div className="pm-cp-two">
            <ProfileCard
              title="Bio"
              edit={owner ? <EditLink href="/join/provider?step=finish" title="Bio" /> : undefined}
            >
              <OverviewBody
                overview={p.overview}
                empty="Nothing here yet. A short bio is the first thing a buyer reads."
              />
            </ProfileCard>
          </div>

          {/* ⚠ THE VISITOR'S BUYING SURFACE, DIRECTLY UNDER BIO AND RATES. */}
          {!owner && serviceProducts}

          <div className="pm-cp-three">
            <ProfileCard
            title="Specializations"
            edit={owner ? <EditLink href="/join/provider?step=specializations&return=review" title="Specializations" /> : undefined}
          >
              <SpecializationsBody specializations={p.specializations} />
            </ProfileCard>
            <ProfileCard
            title="Certifications"
            edit={owner ? <EditLink href="/join/provider?step=finish" title="Certifications" /> : undefined}
          >
              <CertificationsBody
                certifications={p.certifications}
                empty="No certifications yet."
              />
            </ProfileCard>
            <ProfileCard
            title="Education"
            edit={owner ? <EditLink href="/join/provider?step=education&return=review" title="Education" /> : undefined}
          >
              <EducationBody education={p.education} />
            </ProfileCard>
          </div>

          <ProfileCard
            title="Work History"
            edit={owner ? <EditLink href="/join/provider?step=tell_us&return=review" title="Work History" /> : undefined}
          >
            <WorkHistoryBody
              employers={p.employers}
              projects={p.projects}
              isOwner={owner}
              empty="No work history yet."
            />
          </ProfileCard>

          <ProfileCard
            title="Solo Projects"
            edit={owner ? <EditLink href="/join/provider?step=tell_us&return=review" title="Solo Projects" /> : undefined}
          >
            <SoloProjectsBody
              projects={soloProjects}
              isOwner={owner}
              empty="No solo projects yet."
            />
          </ProfileCard>

          {/*
            ⚠⚠ SERVICE PRODUCTS SITS HERE FOR AN OWNER — an inventory item in
            the natural reading order, after the work. ⚠ FOR A VISITOR IT MOVED
            UP, beneath Bio/Rates: a buyer is here to buy, and the thing that
            can be bought should not be below eleven cards of history.
            ⚠ ONE `serviceProducts` NODE, RENDERED IN ONE OF TWO PLACES — not
            two copies that can drift.
          */}
          {owner && serviceProducts}

          {/*
            ⚠ `Learning Paths` RENDERS THE PATHS THIS PERSON TEACHES
            (`getPathsTaughtByProfile`). ⚠⚠ THAT IS THE ONLY PATH RELATION THE
            PROFILE HAS — there is no "paths I am enrolled in" on this surface,
            and inventing one would mean a query nobody asked for.
          */}
          {/*
            ── ⚠⚠ CREATED vs TAKEN, NAMED (`P2-J3-E593` WS-B item 17) ────────

            ⚠ Scott, 2026-09-20: *"Distinguish learning paths CREATED from paths
            TAKEN."* ⚠⚠ THE CARD SHOWED ONLY THE TAUGHT SET UNDER THE NEUTRAL
            TITLE `Learning Paths`, so a reader could not tell which it was —
            and *"you aren't teaching any yet"* was the only clue, visible only
            when the list was empty.
            ⚠ SUPERSEDED, quoted not deleted (`E164`): one flat list of
            `taughtPaths` under the title `Learning Paths`.
            ⚠⚠⚠ THEY ARE DIFFERENT TABLES, NOT A FLAG: teaching is
            `teachesPathWhere` over `LearningPath`; taking is a `LearnEnrollment`
            row. ⚠ A PATH CAN BE BOTH — an author may enrol in their own — and
            each group lists it rather than the card picking a winner.
            ⚠⚠ EACH GROUP RENDERS ONLY WHEN IT HAS ROWS. An empty "Taking"
            heading on a provider who teaches is an absence dressed as a
            section; the card's own empty state covers the both-empty case.
          */}
          <ProfileCard title="Learning Paths">
            {taughtPaths.length === 0 && takenPaths.length === 0 ? (
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {owner
                  ? "You aren\u2019t teaching or taking any learning paths yet."
                  : "No learning paths yet."}
              </p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {taughtPaths.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
                      {owner ? "You Teach" : "Teaches"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {taughtPaths.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/learn/${t.slug}`}
                          className="rounded-full border border-magenta/25 bg-magenta/[0.06] px-3.5 py-1.5 text-[13px] font-bold text-magenta-dark hover:underline"
                        >
                          {t.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {takenPaths.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.07em] text-ink-3">
                      {owner ? "You&rsquo;re Taking" : "Taking"}
                    </p>
                    {/* ⚠ INK, NOT MAGENTA — `E433`. These are still links, so
                        they keep the underline on hover, but a taken path is
                        not an offer and must not read as one beside the set
                        this person actually teaches. */}
                    <div className="flex flex-wrap gap-2">
                      {takenPaths.map((t) => (
                        <Link
                          key={t.slug}
                          href={`/learn/${t.slug}`}
                          className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] font-bold text-ink-2 hover:underline"
                        >
                          {t.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ProfileCard>

          <ProfileCard title="Recommendations">
            {testimonials.length === 0 ? (
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {owner ? (
                  <>
                    No recommendations yet.{" "}
                    {/* ⚠ OWNER-ONLY — a visitor cannot request recommendations
                        on somebody else's behalf. */}
                    <Link
                      href="/recommendations"
                      className="font-bold text-magenta hover:underline"
                    >
                      Request a Recommendation
                    </Link>
                  </>
                ) : (
                  "No recommendations yet."
                )}
              </p>
            ) : (
              <div className="flex flex-col">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className={
                      "flex items-start gap-3 py-3" +
                      ""
                    }
                  >
                    <Avatar
                      firstName={t.author.split(" ")[0] ?? ""}
                      lastName={t.author.split(" ").slice(1).join(" ")}
                      photoUrl={null}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[14.5px] font-bold">{t.author}</span>
                      {(t.title || t.company) && (
                        <p className="text-[12.5px] text-ink-2">
                          {[t.title, t.company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {t.body && (
                        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                          {t.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ProfileCard>
          {/* ⚠⚠ FORUM INVOLVEMENT. Renders NOTHING when the signal is null,
              which is every profile today. ⚠ Carried over so the owner's page
              does not silently lose what `/profile` used to show — see the prop
              note above and `check:community` GUARD 3. */}
          <CommunitySignalBlock
            signal={community}
            firstName={p.person.firstName ?? ""}
            isOwner={owner}
          />
        </div>
      </main>

      {/* ═══════════ RIGHT RAIL ═══════════ */}
      <aside className="pm-cp-rail-r">

        {owner ? (
          <>
            {/*
              ⚠⚠⚠ THE COMPLETION RING IS OWNER-ONLY AND THAT IS A JUDGEMENT, NOT
              A LAYOUT CHOICE: **never show a stranger how incomplete someone
              is.** A percentage on somebody else's profile is a score a buyer
              did not ask for and a provider cannot answer.

              ── ⚠⚠ THE WHOLE CARD IS A LINK (`P2-J3-E590` WS-C) ─────────────

              ⚠ Scott, 2026-09-20: *"The image is the thing that will show on the
              main profile...the baiot to have the user click it."*
              ⚠⚠⚠ A REAL ANCHOR, NEVER AN `onClick` ON A DIV. An anchor opens in
              a new tab on middle-click, offers "copy link", takes focus from the
              keyboard and is announced as a link. A div with a handler does none
              of those and looks identical until somebody needs one of them.
              ⚠ It is also why this stays a SERVER component: there is no state
              and no handler here, only a link.

              ── ⚠⚠ IT REPLACES THE OLD BLOCK. IT DOES NOT SIT BESIDE IT. ────

              ⚠ `E588` WS-A ruled ONE summary of completeness per page and that
              ruling stands. ⚠ SUPERSEDED, quoted not deleted (`E164`) — the
              `enrichmentGaps` list that used to live under the ring:
              //  {p.enrichmentGaps.length > 0 && (
              //    <>
              //      <p …>What To Do Next:</p>
              //      <ul …>{p.enrichmentGaps.map((g) => <li key={g}>{g}</li>)}</ul>
              //    </>
              //  )}
              ⚠⚠ IT WAS A SECOND, WEAKER COMPLETENESS SUMMARY — five fixed
              prompts from `profileEnrichmentGaps`, with no points, no "I have
              none" and no way to finish. `/community/score` is that list done
              properly, so the hook links to it instead of half-repeating it here.
              ⚠ **`profileEnrichmentGaps` IS STILL EXPORTED AND STILL USED
              ELSEWHERE — this removes a RENDER, not the function.**
            */}
            {score && (
            <Link
              href="/community/score"
              className="group block rounded-brand border border-line bg-white px-[18px] py-4 transition-colors hover:border-magenta/40"
            >
              <CompletionRing score={score} />
              <p className="mt-2 text-center text-[12.5px] font-bold text-ink-2">
                Complete Profiles Sell Services
              </p>
              {/* ⚠⚠ COMPUTED, NOT HARD-CODED, and it says something else at
                  100% rather than printing "0 lines left". */}
              <p className="mt-1.5 text-center text-[12px] leading-snug text-ink-3">
                {completionHook(score)}
              </p>
              {/* ⚠ `E433` — the one magenta thing in the card is the affordance
                  that says it is a link. The ring is magenta too, and that is
                  the same rule: both are interactive now. */}
              <p className="mt-2.5 text-center text-[12.5px] font-bold text-magenta group-hover:underline">
                See your score
              </p>
            </Link>
            )}

            <ActionCard
              title="Invite a Colleague"
              label="Invite Colleague to Register"
              href="/invite-colleague"
            />
            <ActionCard
              title="Request Recommendation"
              label="Request a Recommendation"
              href="/recommendations"
            />
            <ActionCard
              title="Request a Mentor"
              label="Request a Mentor"
              href="/community/mentors"
            />
          </>
        ) : (
          <>
            {/*
              ── ⚠⚠ THE TRUST CARD. FACTS THE RECORD HOLDS, NOTHING DERIVED. ──
              ⚠ Every row renders only when its value exists. A missing rate is
              absent, never `$0`; a missing language is absent, never "English"
              as a default — that would be a fact about a person nobody stated.
            */}
            <section className="rounded-brand border border-line bg-white px-[18px] py-4">
              {p.validated ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-magenta">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label="Validated by Panameer">
                        <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                        <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                      </svg>
                    </span>
                    <b className="text-[14px]">Validated by Panameer</b>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                    Panameer has confirmed this provider&rsquo;s identity and
                    work history.
                  </p>
                </>
              ) : (
                /* ⚠⚠ NOT VALIDATED SAYS NOTHING BAD. `validation_status` is
                   granted on merit and most providers have never requested it
                   — 13 of 111 are validated. An "unvalidated" badge would read
                   as a mark against 98 people for a process they were never
                   offered (the door only shipped in `E563`). So the card simply
                   leads with the facts instead. */
                <b className="text-[14px]">About this provider</b>
              )}

              <TrustRow label="Experience" value={p.experience} />
              <TrustRow label="Rate" value={rateRange(p)} />
              <TrustRow
                label={p.languages.length > 1 ? "Languages" : "Language"}
                value={
                  p.languages.length > 0
                    ? p.languages.map((l) => l.name).join(", ")
                    : null
                }
              />
            </section>

            {/*
              ⚠ `Connect as a Colleague` IS `ConnectControls`, PASSED IN. It
              already knows the four relation states (none / pending / accepted
              / mentor) and posts through the same rules the server re-checks.
              ⚠⚠ REBUILDING IT HERE WOULD BE A SECOND COPY OF THE CONNECT RULE.
            */}
            {connect && (
              <section className="rounded-brand border border-line bg-white px-[18px] py-4">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Connect as a Colleague
                </h3>
                {connect}
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  Colleagues can message each other.
                </p>
              </section>
            )}

            {/* ⚠ ONLY WHEN THE PROVIDER SAID SO. `open_for_mentoring` is the
                provider's own statement; absent it, the card does not render. */}
            {p.openForMentoring && (
              <ActionCard
                title="Request Mentoring"
                label="Request Mentoring"
                href="/community/mentors"
                note="Open to mentoring."
              />
            )}

            {/*
              ── ⚠⚠⚠ `Message` READS THE RULE, IT DOES NOT RESTATE IT ─────────
              ⚠ The verdict comes from `canMessage`, which is BYTE-UNCHANGED by
              this brief. The button is disabled exactly when the lib says no,
              and the caption is THE LIB'S OWN STRING.
              ⚠⚠ THE MOCKUP'S SINGLE SENTENCE — *"Available once you are
              colleagues."* — WOULD BE WRONG IN THREE OF THE FIVE DENIAL STATES:
              a pending request, a member who turned messages off, and someone
              with no account are all different answers, and telling all three
              "become colleagues" sends people to do something that will not
              help. ⚠ **Reported at the WS-B gate.**
            */}
            <section className="rounded-brand border border-line bg-white px-[18px] py-4 text-center">
              <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                Message
              </h3>
              {messagePermission?.ok ? (
                <Link
                  href={`/messages?with=${p.person.userId ?? ""}`}
                  className="block w-full rounded-full bg-magenta px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-white transition-colors hover:bg-magenta-dark"
                >
                  Message
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    className="block w-full cursor-not-allowed rounded-full bg-line px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-ink-3"
                  >
                    Message
                  </button>
                  {messagePermission && !messagePermission.ok && (
                    <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                      {messagePermission.message}
                    </p>
                  )}
                </>
              )}
            </section>
          </>
        )}
        {/*
          ── ⚠⚠⚠ THESE TWO SIT **BELOW** THE COMPLETION RING, AND ON A PHONE
             THAT IS THE WHOLE POINT (`P2-J3-E593` WS-B) ────────────────────

          ⚠ `connect-profile.css` gives this rail `order: -1` at ≤1060px —
          `E588` WS-A's ruling, because burying the ring and the actions under
          eleven cards of work history *"put the completion ring roughly 5,000px
          down on a real profile."*
          ⚠⚠ SO THE RAIL IS THE FIRST THING ON A PHONE, and anything added to
          the TOP of it pushes the ring down. ⚠⚠⚠ MEASURED: with Rates and
          Account Health inserted above, the ring — which Scott called *"the
          baiot to have the user click it"* — became the THIRD card on a phone.
          ⚠ That is `E588` WS-A's defect re-created at a smaller scale, so the
          two new cards go after it instead.
        */}
        {/*
          ── ⚠⚠ RATES, AS A SIDE CARD (`P2-J3-E593` WS-B item 14) ───────────

          ⚠⚠⚠ RENDERED FOR BOTH PERSONAS, DELIBERATELY, AND THIS IS THE ONE
          THING TO NOT GET WRONG HERE. `/providers/[id]` renders this same
          component in visitor mode (`E588` WS-B), so putting this card inside
          the owner branch below would have SILENTLY REMOVED RATES FROM THE
          VISITOR PAGE — which is `WS-C`'s item 13, with its own gate and its own
          proof about the RSC payload. ⚠ WS-B moves the card; it does not change
          who can see what.

          ⚠⚠ RATES CARRIES ENGAGEMENT RATES ONLY (Scott's ruling 3, 2026-09-19).
          The mockup lists `Mentoring $75.00` and `Office Hours $4.99` here AND
          as Service Products — the exact duplication `E562`/`E563` removed.
          Those are PRODUCTS and carry their price in the Service Products card.
          ⚠⚠⚠ AND `Hybrid` HAS NO COLUMN: `ProviderProfile` carries
          `onsite_rate_cents` and `remote_rate_cents` and nothing else. (`HYBRID`
          in the schema is a `WorksiteType` on a WORK REQUEST, a different
          model.) ⚠ So the mockup's three rows are two. **Reported, not invented.**
        */}
        <ProfileCard
          title="Rates"
          edit={owner ? <EditLink href="/join/provider?step=finish" title="Rates" /> : undefined}
        >
          <RateRows p={p} />
        </ProfileCard>

        {/*
          ── ⚠⚠ ACCOUNT HEALTH, AS A CARD (`P2-J3-E593` WS-B item 12) ───────

          ⚠ Scott, 2026-09-20: a tick/cross per item, *"to let someone manage
          the strikes against their user account."*
          ⚠⚠ IT IS A SUMMARY OF `/account-health`, NOT A NEW SUBSYSTEM — the
          brief says so in capitals. The same four checks that page runs, off
          the same columns, computed in ONE place (`provider-profile-view.ts`)
          so the two cannot drift into two different answers.
          ⚠⚠⚠ AND THE PAGE REMAINS THE AUTHORITY: this card carries no score, no
          count and no verdict of its own, and its title links there. If they
          ever disagree, the page is right and this is stale.

          ⚠ OWNER-ONLY, AND NOT A LAYOUT CHOICE: account standing is between a
          member and Panameer. ⚠⚠ A VISITOR SEEING SOMEBODY'S ACCOUNT STATUS IS
          THE SAME MISTAKE AS THE COMPLETION RING — a verdict a stranger did not
          ask for and the subject cannot answer.
        */}
        {owner && (
          <ProfileCard
            title="Account Health"
            edit={<EditLink href="/account-health" title="Account Health" label="Manage" icon="" />}
          >
            <div className="flex flex-col">
              {[
                { label: "Sign in and manage your profile", ok: p.accountHealth.canSignIn },
                { label: "Receive messages from buyers", ok: p.accountHealth.receivesMessages },
                { label: "Account status", ok: p.accountHealth.statusActive },
                { label: "Email verified", ok: p.accountHealth.emailVerified },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]"
                >
                  <span className="text-ink-2">{r.label}</span>
                  {/*
                    ⚠⚠ THE MARK CARRIES A TEXT LABEL FOR ASSISTIVE TECH. A tick
                    and a cross are COLOUR AND SHAPE, and neither reaches a
                    screen reader — `aria-label` is what makes the row readable
                    at all. ⚠ `E433` does not apply: these are STATES, not
                    figures, and not interactive.
                  */}
                  <span
                    aria-label={r.ok ? "Yes" : "Needs attention"}
                    className={
                      "flex-none text-[14px] font-bold " +
                      (r.ok ? "text-emerald-600" : "text-amber-600")
                    }
                  >
                    {r.ok ? "\u2713" : "\u2717"}
                  </span>
                </div>
              ))}
            </div>
          </ProfileCard>
        )}
      </aside>
    </div>
  );
}

/**
 * ⚠ ENGAGEMENT RATES ONLY. A row renders only when its column holds a value —
 * a rate nobody set is absent, never `$0.00`, which would be a price.
 */
function RateRows({ p }: { p: ProviderProfileView }) {
  const rows = [
    { label: "Onsite", cents: p.rates.onsiteCents },
    { label: "Fully Remote", cents: p.rates.remoteCents },
  ].filter((r) => r.cents != null);

  if (rows.length === 0) {
    return (
      <p className="text-[13.5px] leading-relaxed text-ink-2">
        No rates set yet. Buyers filter on rate, so this is worth adding.
      </p>
    );
  }

  return (
    <dl className="m-0">
      {rows.map((r) => (
        <div
          key={r.label}
          className={
            "flex justify-between gap-3 py-2 text-[14px]" +
            ""
          }
        >
          <dt className="text-ink-2">{r.label}</dt>
          {/* ⚠ `E433` — a rate is a figure, so ink. */}
          <dd className="m-0 font-bold tabular-nums text-ink">
            {money(r.cents!, p.rates.currency)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ActionCard({
  title,
  label,
  href,
  note,
}: {
  title: string;
  label: string;
  href: string;
  /** ⚠ One line under the button saying why it is offered. Optional. */
  note?: string;
}) {
  return (
    <section className="rounded-brand border border-line bg-white px-[18px] py-4 text-center">
      <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
        {title}
      </h3>
      {/* ⚠ MAGENTA, and that is the rule working as intended (`E433`): the ring
          above is a figure and is ink; these are the interactive things. */}
      <Link
        href={href}
        className="block w-full rounded-full bg-magenta px-3.5 py-2.5 text-[13.5px] font-bold leading-tight text-white transition-colors hover:bg-magenta-dark"
      >
        {label}
      </Link>
      {note && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">{note}</p>
      )}
    </section>
  );
}

/**
 * ⚠ ONE FACT PER ROW, AND A ROW WITH NO VALUE DOES NOT RENDER. An empty row on
 * a trust card is worse than a missing one — it reads as a fact we checked and
 * could not confirm.
 */
function TrustRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
      <span className="text-ink-2">{label}</span>
      {/* ⚠ `E433` — a figure, so ink. */}
      <b className="text-ink">{value}</b>
    </div>
  );
}

/**
 * ⚠ THE ADVERTISED RANGE, exactly as `E078c` stores it. Returns null when no
 * rate is set — the row then does not render, rather than printing `$0`.
 */
function rateRange(p: ProviderProfileView): string | null {
  const { minCents, maxCents, currency } = p.rates;
  if (minCents == null && maxCents == null) return null;
  const lo = minCents ?? maxCents!;
  const hi = maxCents ?? minCents!;
  return lo === hi
    ? money(lo, currency)
    : `${money(lo, currency)} – ${money(hi, currency)}`;
}

/** ⚠ Integer cents, like every other money value in the app. */
function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}
