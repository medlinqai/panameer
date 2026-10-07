import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ProfileVisibilityCard } from "@/components/profile/ProfileVisibilityCard";
import { HireButton } from "@/components/community/HireButton";
import { ShareBar, HowToWorkWith } from "@/components/community/ProfileFooter";
// row asks it rather than deciding the fallback a second time.
// THE FACES ROW IS GONE WS-C item 3) — Scott: *"The colleague
// EVERY EDIT LINK NOW OPENS ONE SECTION WS-C).
import { editHref } from "@/lib/profile-sections";
import { GROWTH_WEIGHTS } from "@/lib/growth-score";
// THE SHARED OUTSTANDING-LINES RULE item 2)
import { openScoreLines, openScoreMinutes } from "@/lib/score-open";

/** THE LESSON COUNT ON A COURSE ROW item 8) */
function lessonCount(n: number): string {
  if (n <= 0) return "No lessons yet";
  return `${n} lesson${n === 1 ? "" : "s"}`;
}
// The rail's score block is now the mockup's thin ink ring with `of 100` and one items-left
import type { ProviderProfileView } from "@/lib/provider-profile-view";
import type { TaughtPath, TakenPath } from "@/lib/learn-home";
// usage one-liner both left this component. `lib/usage-stats.ts` is
import type { Testimonial } from "@/lib/recommendations";
import type { CommunitySignal } from "@/lib/community-signal";
import type { ProfileScore } from "@/lib/completeness";
import type { MessagePermission } from "@/lib/messages";
// document for the re-run to read. `OwnerResumeRerun` STAYS ON DISK in `OwnerAiPass.tsx`
import { OwnerResumeRebuild } from "@/components/profile/OwnerResumeRebuild";
import { CommunitySignalBlock } from "@/components/profile/CommunitySignal";
import {
  CertificationsBody,
  EducationBody,
  LanguagesBody,
  // ONE EDIT PATTERN ( WS-B item 6) — `EditLink` lives beside
  OverviewBody,
  // THE SAME CHIPS THE OWNER'S HERO USES WS-G item 1) — reused
  SkillsBody,
  SoloProjectsBody,
  SpecializationsBody,
  WorkHistoryBody,
  // the Skills chip, which is the one definition Scott named. `CHIP_TAG` still exists and is
  locationLines,
} from "@/components/profile/sections";
import "./connect-profile.css";
// THE CLEAN DIRECTION'S OWN PIECES WS-A). `ProfileCard`/`EditLink`
import {
  CleanSection,
  CleanEdit,
  CLEAN_CHIP,
  CleanSide,
} from "@/components/profile/CleanSection";


/** CONNECT HOME IS THE PROFILE WS-A, OWNER MODE) */
/** NO DIVIDER LINES INSIDE A CARD WS-B item 4) */
export function ConnectProfile({
  p,
  taughtPaths = [],
  takenPaths = [],
  // HERE WS-B), and that is THE PAGE RULE, not an omission.
  testimonials = [],
  community = null,
  score = null,
  // COUNT now and nothing renders the avatars.
  // The owner's growth score and rank, for the `Grow` card's one-liner
  growth = null,
  youBothKnow = null,
  canHire = false,
  messagePermission = null,
  connect,
  mentor,
  previewAsBuyer = false,
}: {
  p: ProviderProfileView;
  taughtPaths?: TaughtPath[];
  /** `LearnEnrollment` rows — paths TAKEN, not taught (`E593` WS-B 17). */
  takenPaths?: TakenPath[];
  testimonials?: Testimonial[];
  /** FORUM INVOLVEMENT — CARRIED OVER DELIBERATELY, NOT IN THE MOCKUP. */
  community?: CommunitySignal | null;
  /** THE PER-LINE BREAKDOWN, for the completion card WS-C). */
  score?: ProfileScore | null;
  /** A REAL COUNT of accepted COLLEAGUE connections. The Counters decision is */
  /** OWNER ONLY — up to seven colleague faces for the row under the count */
  /** OWNER ONLY — how many people have looked at this profile, one per viewer */
  /** VISITOR ONLY — accepted colleagues the viewer and this provider share. */
  /** COMPUTED BY THE PAGE, NOT HERE. `growthScore` is a DATABASE read and */
  growth?: { points: number; rank: number | null } | null;
  youBothKnow?: number | null;
  /** THE MESSAGE VERDICT, READ FROM `canMessage` — THE BUTTON READS THE RULE */
  /** MAY THIS VIEWER BUY? */
  canHire?: boolean;
  messagePermission?: MessagePermission | null;
  /** somebody else. Carried over unchanged from `/providers/[id]`. */
  connect?: ReactNode;
  /** THE MENTOR HALF OF `ConnectControls` item 10) */
  mentor?: ReactNode;
  /** THE BUYER'S VIEW, EVEN WHEN THE OWNER IS LOOKING ( WS-D) */
  previewAsBuyer?: boolean;
}) {
  // THE SINGLE `isOwner` POINT WS-B)
  // ( WS-D). That is what makes *"every owner affordance is absent in the
  const owner = p.isOwner && !previewAsBuyer;

  // The groups this profile belongs to — see the card in the right rail.
  // IT LISTS `LearningPath.group`, NOT `title`, AND THE CHOICE IS MEASURED.
  const visitorGroups = Array.from(
    new Set(
      [...taughtPaths, ...takenPaths].map((t) => (t.group?.trim() ? t.group : t.title))
    )
  );

  const fullName = [p.person.firstName, p.person.lastName]
    .filter(Boolean)
    .join(" ");

  // A SOLO PROJECT IS ONE NO EMPLOYER CLAIMS. THE DERIVATION IS COPIED
  const openLines = openScoreLines(score);
  const remainingLines = openLines.length;
  // TWO, BECAUSE THE BRIEF SAYS TWO: *"the ring, the two next items with
  // THE MINUTES ON THE SEARCH SCORE BLOCK ( row 9), SUMMED FROM THE SAME
  const minutesLeft = openScoreMinutes(openLines);
  // block states the COUNT and the total minutes; the per-line detail is one click away on
  // listed these four rows is gone (WS-C item 3) and `/account-health` remains
  // THE `Account` ONE-LINER WENT WITH THE ONE-LINERS CARD ( WS-B).

  // WHAT A VISITOR MAY SEE OF SOMEBODY'S LEARNING (WS-A item 6 / brief item 11)
  const visibleTaken = owner ? takenPaths : takenPaths.filter((t) => t.completed);

  const soloProjects = p.projects.filter(
    (pr) => !p.employers.some((e) => (e.projects ?? []).some((n) => n.id === pr.id))
  );


  // ONE SERVICE-PRODUCTS CARD, TWO POSITIONS AND TWO AFFORDANCES
  // RENAMED `Services` WS-A item 7 / brief item 10). Scott
  const serviceProducts = (
    <CleanSection
          // THE OWNER AND THE VISITOR READ DIFFERENT NAMES item 6)
          title={owner ? "My Service Products" : "Service Products"}
          /* SUPERSEDED, quoted not deleted (`E164`): title="Services" */
          count={p.packages.length}
          showWhenEmpty={owner}
        >
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
                data-row
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
                  {/* `E433` — a price is a figure, so ink. */}
                  {pk.priceCents != null && (
                    <b className="text-[14px] tabular-nums text-ink">
                      {money(pk.priceCents, pk.currency)}
                    </b>
                  )}
                  {/* THE BUY AFFORDANCE IS DISABLED AND NAMED. Nobody buys */}
                  {!owner && (
                    <Link
                      href={`/shop/${pk.id}`}
                      className="mt-1.5 inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-semibold text-surface hover:bg-ink-hover"
                    >
                      Make an Offer
                    </Link>
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
    </CleanSection>
  );

  // THE SCORE BLOCK IS EXTRACTED SO THE PHONE ROW CAN HOLD IT ( item 1)
  const scoreBlock = owner && score ? (
        // SCOPED SO ONLY *THIS* BLOCK GROWS item 8)
        <div className="pm-score-block">
        <CleanSide title="Search Score" titleHref="/score">
          <div className="flex items-center gap-4">
            {/* SVG ring: one stroke width all the way round (a CSS conic ring rendered uneven). */}
            <span className="relative inline-grid h-[78px] w-[78px] flex-none place-items-center" data-score-ring>
              <svg viewBox="0 0 78 78" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
                <circle cx="39" cy="39" r="35" fill="none" stroke="#C9CDDC" strokeWidth="6" />
                <circle cx="39" cy="39" r="35" fill="none" stroke="var(--color-ink)" strokeWidth="6"
                  strokeDasharray={`${(Math.min(100, Math.max(0, score.total)) / 100) * 2 * Math.PI * 35} ${2 * Math.PI * 35}`} />
              </svg>
              <span className="relative text-[23px] font-bold tabular-nums">{score.total}</span>
            </span>
            <span className="min-w-0 text-[13px] leading-snug text-ink-2">
              {/* SCOTT ( item 12): the figure's unit reads "out of 100". */}
              out of 100
              <br />
              {/* A REAL ZERO AND A FINISHED PROFILE MUST NOT READ THE SAME (counting */}
              <Link
                href="/score"
                data-e716-items
                className="font-semibold text-magenta-dark hover:underline"
              >
                {remainingLines > 0 ? (
                  <>
                    {/* SCOTT ( item 12): "N items left – about M mins" — an en */}
                    {remainingLines} item{remainingLines === 1 ? "" : "s"} left
                    {minutesLeft > 0 ? ` – about ${minutesLeft} mins` : ""}
                  </>
                ) : (
                  "Nothing outstanding"
                )}
              </Link>
            </span>
          </div>
        </CleanSide>
        </div>
  ) : null;

  return (
    <div className="pm-cp3">
      {/* SCOTT'S LAYOUT A — NO WIDE HEADER WS-B) */}
      <aside className="pm-cp3-rail">
        {/* THE IDENTITY BOX IS GONE WS-A item 1 / brief item 2) */}
        {/* THE RAIL IS SIX NAMED BLOCKS NOW items 1–3) */}
        {/* inside it, which is the order Scott asked for — and becomes a FLEX ROW at phone */}
        <div className="pm-rail-top">
        <section className="pm-rail-photo">
          <div>
            {/* EACH EDIT CONTROL MOVES BESIDE WHAT IT EDITS (WS-B) */}
            {/* ROW 1 — THE PHOTO IS THE COLUMN */}
            <div className="pm-photo" data-e715-photo>
              {p.person.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.person.photoUrl} alt="" />
              ) : (
                <span className="pm-photo-initials">
                  {`${p.person.firstName?.[0] ?? ""}${p.person.lastName?.[0] ?? ""}`.toUpperCase() ||
                    "?"}
                </span>
              )}
              {owner && (
                <Link
                  href={editHref("photo")}
                  aria-label="Edit Photo"
                  className="pm-photo-edit text-magenta-dark hover:underline"
                >
                  Edit photo
                </Link>
              )}
            </div>
            {/* THE COMPANY, UNDER THE PHOTO (Scott 2026-10-07, LinkedIn-style): logo + name, one link. */}
            {p.sellingCompany ? (
              <Link href={`/companies/${p.sellingCompany.id}`} data-profile-company aria-label={p.sellingCompany.name} title={p.sellingCompany.name} className="group mt-5 flex justify-center">
                {p.sellingCompany.logo_url ? (
                  // Logo only, centred, no box (Scott's mockup 2026-10-07) — the logo carries the name.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.sellingCompany.logo_url} alt={p.sellingCompany.name} className="block h-auto max-h-[80px] w-[75%] object-contain" />
                ) : (
                  <span className="text-[15px] font-bold text-ink group-hover:underline">{p.sellingCompany.name}</span>
                )}
              </Link>
            ) : owner ? (
              <p data-profile-company className="mt-3 text-[13px] text-ink-2">
                No company yet ·{" "}
                <Link href="/company?join=1#join" className="font-bold text-magenta-dark underline underline-offset-2">Add Company</Link>
              </p>
            ) : null}
          </div>
        </section>
        {/* THE SCORE BLOCK IS RENDERED HERE, INSIDE `pm-rail-top`, so the phone row can put */}
        {scoreBlock}
        </div>

        {/* ITEM 2 — THE BUTTON IS ITS OWN BLOCK */}
        <div className="pm-rail-button">
            {/* ROWS 2 AND 13 — THE NAME, TITLE, LOCATION AND `How You Work` HAVE LEFT */}
            {/* THE IDENTITY CARD GROWS ITS EDIT CONTROLS ( WS-F) */}
            {/* WHAT IS LEFT OF THE ROW, AND WHY EACH ONE IS STILL HERE */}
            {/* THEY NAME WHAT THEY EDIT WHILE THEY ARE STILL A ROW. */}
            {/* THE EDIT ROW IS EMPTY AND SO IT IS GONE row 13) */}
                {/* REMOVED : THE LANGUAGES CARD NOW EXISTS AND */}
                {/* as a plain link beside location, member-since and languages. */}
            {owner && (
              <div className="mt-4 flex flex-col">
                {/* ROW 4 — SQUARE, FULL WIDTH, INK. NOT A MAGENTA PILL */}
                {/* SCOTT, 2026-09-30. The button went to `/community/score`; the */}
                {/* AND THIS ONE TAKES THE INK */}
                <Link
                  href={`/providers/${p.id}`}
                  data-e715-btn
                  className="pm-btn pm-btn-primary transition-colors"
                >
                  {/* SCOTT, WS-B: rename to "How Others See My Profile". */}
                  How Others See My Profile
                </Link>
                {/* SCOTT: *"a magenta text link under How Others See My Profile"* — and */}
                <OwnerResumeRebuild />
              </div>
            )}
        </div>

        {/* ROW 10 — THE RAIL'S ORDER IS THE MOCKUP'S */}

        {/* ROW 9 — SEARCH SCORE, AND THE FIGURE IS NOT A NEW ONE */}
        {/* TWO NAMED DOORS, NOT ONE BLOCK-WIDE LINK */}

        {/* RATES WAS RENDERED HERE, THIRD IN THE RAIL. IT IS NOW LAST, immediately above */}

        {/* VISIBILITY ARRIVES FROM SETTINGS (ruling 78) */}
        {/* — the two public-preview switches and the member's */}
        {owner && (
          <ProfileVisibilityCard
            paused={p.paused}
            previewHidden={p.previewHidden}
            publicName={p.publicName}
            publicUrl={p.publicUrl}
          />
        )}

        {owner ? (
          <>
            {/* THE OLD SCORE CARD IS GONE; ROW 9's BLOCK REPLACED IT ABOVE */}

            <section className="pm-rail-rank mt-7 border-t border-line pt-5">
                            {/* THE TITLE STAYS `Grow` FOR NOW (Scott, 2026-09-22, at the */}
                            {/* WS-C and WS-B both kept the title `Grow` */}
                {/* THE WORDS ARE UNCHANGED, ONLY THE WEIGHT ( row 10): every rail */}
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  Rank Higher in Search Results
                </h2>
                            <div className="flex flex-col">
                              {[
                                // THE ONE-LINER IS ADDED, NOT SWAPPED IN (
                                {
                                  // as a second name for the same thing."*
                                  label: "Grow Your Community",
                                  href: "/community/grow",
                                  hint: growth
                                    ? `${growth.points} points${growth.rank ? ` · #${growth.rank} this month` : ""}`
                                    : `A colleague who joins is worth ${GROWTH_WEIGHTS.JOINED} points`,
                                },
                                { label: "Invite a Colleague", href: "/invite-colleague", hint: "Join = 50 points" },
                                { label: "Request a Recommendation", href: "/recommendations", hint: null },
                                { label: "Request a Mentor", href: "/community/mentors", hint: null },
                              ].map((a) => (
                                <Link
                                  key={a.href}
                                  href={a.href}
                                  className="-mx-2 flex items-center justify-between gap-2 px-2 py-2 transition-colors hover:bg-black/[0.03]"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate text-[13.5px] font-semibold">
                                      {a.label}
                                    </span>
                                    {a.hint && (
                                      <span className="block text-[12px] text-ink-3">{a.hint}</span>
                                    )}
                                  </span>
                                  <span aria-hidden className="flex-none text-ink-3">
                                    &rsaquo;
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </section>
          </>
        ) : (
          <>
              {/* RESTORED AT THE WS-C GATE. It lived in the left rail's */}
              <section className="mt-7 border-t border-line pt-5">
                <div className="flex items-center justify-between gap-2.5 text-[13.5px]">
                  <span className="text-ink-2">You Both Know</span>
                  {/* `E433` — a figure is INK. */}
                  <b className="text-ink">{youBothKnow ?? 0}</b>
                </div>
              </section>
            {/* THE TRUST CARD. FACTS THE RECORD HOLDS, NOTHING DERIVED. */}
            {/* THE RATE LINE IS GONE; THE `RATES` BLOCK KEEPS IT ( item 9) */}
            {(p.validated || p.experience) && (
            <section className="mt-7 border-t border-line pt-5">
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
                // NOT VALIDATED SAYS NOTHING BAD. `validation_status` is
                <b className="text-[14px]">About this provider</b>
              )}

              <TrustRow label="Experience" value={p.experience} />
              {/* THE LANGUAGES ROW LEFT THIS STRIP FOR ITS OWN CARD (WS-B). */}
            </section>
            )}

            {/* already knows the four relation states (none / pending / accepted */}
            {/* THE GROUPS THIS PROFILE BELONGS TO ( WS-C item 13) */}
            {visitorGroups.length > 0 && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Groups
                </h3>
                <div className="flex flex-wrap gap-2">
                  {visitorGroups.slice(0, 6).map((g) => (
                    // THE SKILLS CHIP, NOT A SECOND MAGENTA item 5)
                    <span key={g} className={CLEAN_CHIP}>
                      {g}
                    </span>
                  ))}
                </div>
                {visitorGroups.length > 6 && (
                  <p className="mt-2 text-[12px] text-ink-3">
                    +{visitorGroups.length - 6} more
                  </p>
                )}
                <Link
                  href="/community/groups"
                  className="mt-2.5 inline-block text-[13px] font-bold text-magenta hover:underline"
                >
                  Browse Groups
                </Link>
              </section>
            )}

            {/* SCOTT: solid ink, first of the actions, above `Message` and `Connect as a */}
            {canHire && p.person.personId && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Hire
                </h3>
                <HireButton providerPersonId={p.person.personId} />
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  {/* It says what the click DOES, because it creates a row. A control that */}
                  Starts a work request for this provider only. You can complete the
                  details before anyone is contacted.
                </p>
              </section>
            )}

            {/* THE ORDER IS SCOTT'S item 4) */}
            {/* The verdict comes from `canMessage`, which is BYTE-UNCHANGED by */}
            <section className="mt-7 border-t border-line pt-5 text-center">
              <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                Message
              </h3>
              {messagePermission?.ok ? (
                <Link
                  href={`/messages?with=${p.person.userId ?? ""}`}
                  // WHITE WITH AN INK BORDER — `Hire` is the primary on this rail
                  className="pm-btn transition-colors"
                >
                  Message
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    disabled
                    // THE DISABLED FACE KEEPS THE FAMILY'S SHAPE BUT NOT ITS BORDER
                    className="pm-btn cursor-not-allowed border-line bg-line text-ink-3"
                  >
                    Message
                  </button>
                  {/* THREE STATES, NOT TWO. `null` IS NOT `!ok`. */}
                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                    {messagePermission
                      ? messagePermission.message
                      : "This is where buyers message you. You can't message yourself."}
                  </p>
                </>
              )}
            </section>

            {connect && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  Connect as a Colleague
                </h3>
                {connect}
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  Colleagues can message each other.
                </p>
              </section>
            )}

            {/* THE REAL CONTROL, NOT A DOOR TO A DIRECTORY item 10) */}
            {mentor && p.openForMentoring && (
              <section className="mt-7 border-t border-line pt-5">
                <h3 className="mb-2.5 font-display text-[14.5px] font-bold leading-tight">
                  {/* BACK TO `Request to Mentor` item 3) */}
                  Request to Mentor
                </h3>
                {mentor}
                <p className="mt-2.5 text-[12px] leading-relaxed text-ink-2">
                  {/* IT SAYS WHAT THE BUTTON DOES. A `MENTOR` row is created `ACCEPTED` */}
                  This provider is open to mentoring. Following them does not need their
                  approval, and it does not let either of you message the other.
                </p>
              </section>
            )}

          </>
        )}
        {/* ITEM 3 — RATES MOVES TO THE BOTTOM OF THE RAIL */}
        {p.rates && (
          // RATES IS A SIDE BLOCK, NOT A SECTION WS-A item 9)
          <div className="pm-rail-rates">
            <CleanSide
              title="Rates"
              action={owner ? <CleanEdit href={editHref("rates")} title="Rates" /> : undefined}
            >
              <RateRows p={p} />
            </CleanSide>
          </div>
        )}
      </aside>

      <main className="pm-cp3-main">
        {/* ROWS 2, 3 AND 13 — THE RECORD OPENS WITH WHO THIS IS */}
        <header className="pm-main-head">
          <div className="flex items-center gap-2">
            {owner ? (
              <h2 className="text-[30px] font-bold leading-[1.2] tracking-[-0.01em]">
                {fullName}
              </h2>
            ) : (
              <h1 className="text-[30px] font-bold leading-[1.2] tracking-[-0.01em]">
                {fullName}
              </h1>
            )}
            {p.validated && (
              <span title="Validated by Panameer" className="text-magenta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label="Validated by Panameer" role="img">
                  <path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.9 2.9.9 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.9-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" />
                  <path d="M10.6 15.2l-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1z" fill="#fff" />
                </svg>
              </span>
            )}
          </div>

          {/* RULING 31c travels with the title: `"+AI Enabled…"` is an EXAMPLE of a title */}
          {(p.headline || owner) && (
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 text-[16px] text-ink-2">
              {p.headline}
              {owner && <CleanEdit href={editHref("title")} title="Title" />}
            </p>
          )}

          {/* THE META LINE. EVERY ITEM IS A FACT THAT EXISTS */}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[14px] text-ink-2">
            {/* ITEM 11 — THE MAP LINK, AND WHAT IS NOT IN IT */}
            {(() => {
              const lines = locationLines(p.location, p.country);
              if (!lines) return null;
              const query = [lines.primary, lines.secondary].filter(Boolean).join(", ");
              const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
              return (
                <span className="flex items-center gap-1.5">
                  <MetaIcon kind="pin" />
                  {/* A new tab, and `noreferrer` with it: the profile's URL is not Google's */}
                  <a
                    href={map}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:underline"
                  >
                    {lines.primary}
                    {lines.secondary ? ` · ${lines.secondary}` : ""}
                  </a>
                </span>
              );
            })()}
            {/* Month and year only: the DAY somebody joined is not a fact anyone needs. */}
            {p.person.memberSince && (
              <span className="flex items-center gap-1.5">
                <MetaIcon kind="calendar" />
                Member since{" "}
                {new Date(p.person.memberSince).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
            {p.languages.length > 0 && (
              <span className="flex items-center gap-2">
                {p.languages.map((l) => l.name).join(" · ")}
                {owner && <CleanEdit href={editHref("languages")} title="Languages" />}
              </span>
            )}
            {/* ROW 13 — `How You Work` LANDS HERE, AS A PLAIN LINK. It was a stray */}
            {owner && (
              <Link
                href={editHref("work-method")}
                className="font-semibold text-magenta-dark hover:underline"
              >
                How You Work
              </Link>
            )}
          </div>

          {/* ROW 3 — THE BIO IS PLAIN TEXT, NOT A FOLDING SECTION */}
          {(p.overview || owner) && (
            <div id="bio" className="mt-5 scroll-mt-24 text-[15px] leading-relaxed">
              <OverviewBody
                overview={p.overview}
                empty="Nothing here yet. A short bio is the first thing a buyer reads."
              />
              {/* THE MOCKUP TRAILS `Edit` AFTER THE BIO'S LAST WORD; THIS SITS IT ON THE */}
              {owner && (
                <div className="mt-1">
                  <CleanEdit href={editHref("bio")} title="Bio" />
                </div>
              )}
            </div>
          )}
        </header>
        {/* <CleanSection id="bio" title="Bio" isEmpty={!p.overview} showWhenEmpty={owner} */}

        {/* THE VISITOR'S BUYING SURFACE, HIGH UP — a buyer is here to buy. */}
        {!owner && serviceProducts}

        {/* SKILLS AND SPECIALIZATIONS ARE TWO CARDS AGAIN (WS-B) */}
        <CleanSection
          id="skills"
          // CLOSED AT LOAD , Scott 2026-09-30)
          open={false}
          title="Skills"
          count={p.skills.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("skills")} title="Skills" /> : undefined}
        >
          <p data-hint className="-mt-1 mb-2.5 text-[12.5px] text-ink-3">Features of the software, e.g., Purchase Requisitions</p>
          {p.skills.length > 0 ? (
            groupSkillsByPillar(p.skills).map((g) => (
              <div key={g.pillar ?? "__none"} className="mb-3 last:mb-0">
                <p className="mb-1.5 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
                  {g.pillar ?? "Other"}
                </p>
                <SkillsBody skills={g.skills} chipClass={CLEAN_CHIP} />
              </div>
            ))
          ) : (
            <p className="text-[13.5px] text-ink-2">
              No skills listed yet.{" "}
              {owner && (
                <Link href={editHref("skills")} className="font-bold text-magenta hover:underline">
                  Add your skills
                </Link>
              )}
            </p>
          )}
        </CleanSection>

        {/* SPECIALIZATIONS SPANS THE PAGE WS-C 1 + 3) */}
        <CleanSection
          id="specializations"
          // CLOSED AT LOAD , Scott 2026-09-30)
          open={false}
          title="Specializations"
          count={p.specializations.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("specializations")} title="Specializations" /> : undefined}
        >
          <p data-hint className="-mt-1 mb-2.5 text-[12.5px] text-ink-3">Areas of expertise, e.g., Procure-to-Pay, Coupa, Healthcare</p>
          <SpecializationsBody specializations={p.specializations} chipClass={CLEAN_CHIP} />
        </CleanSection>

        <CleanSection
          id="keywords"
          open={false}
          title="Keywords"
          count={p.keywords.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("keywords")} title="Keywords" /> : undefined}
        >
          {p.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {p.keywords.map((k) => (
                <span key={k} data-row className={CLEAN_CHIP}>{k}</span>
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] text-ink-2">No keywords yet.</p>
          )}
        </CleanSection>

        <div className="pm-cp-pair">
          <CleanSection
            id="certifications"
          // CLOSED AT LOAD , Scott 2026-09-30)
          open={false}
            title="Certifications"
          count={p.certifications.length}
          showWhenEmpty={owner}
            action={owner ? <CleanEdit href={editHref("certifications")} title="Certifications" /> : undefined}
          >
            <CertificationsBody
              certifications={p.certifications}
              empty="No certifications yet."
              emptyAction={
                owner ? (
                  // THE LINE SHIPS, BECAUSE THE TEST EXISTS ( WS-E 1)
                  <Link href="/learn" className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline">
                    Click Here to Take a Free Certification Test Now
                  </Link>
                ) : undefined
              }
            />
          </CleanSection>
          <CleanSection
            id="education"
          // CLOSED AT LOAD , Scott 2026-09-30)
          open={false}
            title="Education"
          count={p.education.length}
          showWhenEmpty={owner}
            action={owner ? <CleanEdit href={editHref("education")} title="Education" /> : undefined}
          >
            <EducationBody
              education={p.education}
              emptyAction={
                owner ? (
                  <Link href="/learn" className="mt-2 inline-block text-[13.5px] font-bold text-magenta hover:underline">
                    Browse Learning Paths
                  </Link>
                ) : undefined
              }
            />
          </CleanSection>
          {/* LANGUAGES BECOMES ITS OWN CARD (brief 10 WS-B) */}
          <CleanSection
            id="languages"
          // CLOSED AT LOAD , Scott 2026-09-30)
          open={false}
            title="Languages"
            count={p.languages.length}
            showWhenEmpty={owner}
            action={owner ? <CleanEdit href={editHref("languages")} title="Languages" /> : undefined}
          >
            <LanguagesBody languages={p.languages} />
          </CleanSection>
        </div>

        {/* WORK HISTORY AND SOLO PROJECTS ARE TWO CARDS AGAIN (WS-B). They */}
        <CleanSection
          id="work-history"
          title="Work History"
          count={p.employers.length}
          showWhenEmpty={owner}
          // THE RÉSUMÉ RE-RUN, MOUNTED WS-E 2)
          // THE RÉSUMÉ RE-RUN IS GONE FROM THIS SLOT item 9)
          action={
            owner ? <CleanEdit href={editHref("work-history")} title="Work History" /> : undefined
          }
        >
          <WorkHistoryBody
            employers={p.employers}
            projects={p.projects}
            isOwner={owner}
            /* THE CLEAN PROFILE IS THE ONLY CALLER THAT ASKS FOR THE TIMELINE (WS-A item 7). */
            timeline
            // ROW 12 — THE ROLE LEADS, THE COMPANY SITS UNDER IT IN GREY. Opt-in for
            roleFirst
            empty="No work history yet."
          />
        </CleanSection>

        <CleanSection
          id="solo-projects"
          title="Solo Projects"
          count={soloProjects.length}
          showWhenEmpty={owner}
          action={owner ? <CleanEdit href={editHref("solo-projects")} title="Solo Projects" /> : undefined}
        >
          <SoloProjectsBody
            projects={soloProjects}
            isOwner={owner}
            // THE EXPLANATION IS `SoloProjectsBody`'s OWN LINE AND IS ALREADY ON SCREEN
            empty="No solo projects yet."
          />
        </CleanSection>

        {owner && serviceProducts}

        {/* THE TITLE IS WRONG FOR HALF ITS OWN ROWS */}
        {/* RENAMED `Teaching` (WS-A item 7 / brief item 10). Scott: `Learning Paths I */}
        <CleanSection
          title={owner ? "My Courses" : "Courses"}
          count={taughtPaths.length}
          showWhenEmpty={owner}
        >
          {taughtPaths.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              {owner
                ? "You aren\u2019t teaching any learning paths yet."
                : "Not teaching any learning paths yet."}
            </p>
          ) : (
            // ROWS, NOT CHIPS item 8)
            <ul className="pm-course-rows">
              {taughtPaths.map((t) => (
                <li data-row key={t.slug}>
                  <Link href={`/learn/${t.slug}`} className="pm-course-row">
                    <span className="pm-course-name">{t.title}</span>
                    <span className="pm-course-meta">{lessonCount(t.lessons)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CleanSection>

        {/* LEARNING — ITS OWN SECTION WS-A item 6 / brief item 11) */}
        <CleanSection
          title={owner ? "Courses Taken / In-Process" : "Courses Taken"}
          count={visibleTaken.length}
          showWhenEmpty={owner}
        >
          {visibleTaken.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              {/* Ruling 18: neutral, no apology, no roadmap, nothing blaming the member. */}
              You aren&rsquo;t enrolled in a learning path yet.{" "}
              <Link href="/learn" className="font-bold text-magenta hover:underline">
                Browse learning paths
              </Link>
            </p>
          ) : (
            // ROWS, NOT CHIPS ( item 8) — see the note on `My Courses` above.
            <ul className="pm-course-rows">
              {visibleTaken.map((t) => (
                <li data-row key={t.slug}>
                  <Link href={`/learn/${t.slug}`} className="pm-course-row">
                    <span className="pm-course-name">{t.title}</span>
                    <span className="pm-course-meta">
                      {lessonCount(t.lessons)}
                      {/* THE WORD IS ONLY PRINTED WHEN IT IS TRUE. `Completed` on a */}
                      {t.completed && (
                        <span className="pm-course-done">· Completed</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CleanSection>

        <CleanSection
          title="Recommendations"
          count={testimonials.length}
          showWhenEmpty={owner}
        >
          {testimonials.length === 0 ? (
            <p className="text-[13.5px] leading-relaxed text-ink-2">
              {owner ? (
                <>
                  No recommendations yet.{" "}
                  {/* OWNER-ONLY — a visitor cannot request recommendations */}
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
                  data-row
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
        </CleanSection>
        {/* FORUM INVOLVEMENT — "groups". Renders nothing when the signal is */}
        <CommunitySignalBlock
          signal={community}
          firstName={p.person.firstName ?? ""}
          isOwner={owner}
        />

        {/* THE PROFILE FOOTER — (super run 2 B3, lane 5) */}
        {owner ? (
          <ShareBar
            url={p.publicUrl ?? null}
            name={`${p.person.firstName ?? ""} ${p.person.lastName ?? ""}`.trim()}
          />
        ) : (
          canHire && (
            <HowToWorkWith
              firstName={p.person.firstName ?? ""}
              // The SAME control the Hire block above uses — `/hire` is the
              hireHref="/hire"
              describeHref="/create-work"
            />
          )
        )}
      </main>
    </div>
  );
}

/** THE USAGE COMB — SIX APPLICATIONS, SIX FIGURES */
// THE USAGE COMB IS GONE FROM THE PROFILE WS-C item 3)

/** GROUPED BY THE CATALOG'S OWN DOMAIN LEVEL WS-G item 1). */
function groupSkillsByPillar(
  skills: { id: string; name: string; pillar: string | null }[]
): { pillar: string | null; skills: { id: string; name: string }[] }[] {
  const groups = new Map<string, { pillar: string | null; skills: { id: string; name: string }[] }>();
  for (const s of skills) {
    const key = s.pillar ?? "__none";
    if (!groups.has(key)) groups.set(key, { pillar: s.pillar, skills: [] });
    groups.get(key)!.skills.push({ id: s.id, name: s.name });
  }
  return [...groups.values()].sort((a, b) =>
    a.pillar === null ? 1 : b.pillar === null ? -1 : 0
  );
}

/** ENGAGEMENT RATES ONLY. A row renders only when its column holds a value — */
function RateRows({ p }: { p: ProviderProfileView }) {
  // absent from the PAYLOAD, not merely unrendered. This returns nothing
  if (!p.rates) return null;
  const rates = p.rates;
  // EVERY RATE THE GATE COUNTS WS-G item 2)
  const rows = rates.columns.filter((r) => r.cents != null);

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
          {/* `E433` — a rate is a figure, so ink. */}
          <dd className="m-0 font-bold tabular-nums text-ink">
            {money(r.cents!, rates.currency)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Its only remaining use was the `Request Mentoring` card, which item 10 replaced with the

/** THE META LINE'S ICONS item 11) */
function MetaIcon({ kind }: { kind: "pin" | "calendar" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-[15px] w-[15px] flex-none stroke-ink-3"
      fill="none"
      strokeWidth="1.6"
    >
      {kind === "pin" ? (
        <>
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      ) : (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </>
      )}
    </svg>
  );
}

/** ONE FACT PER ROW, AND A ROW WITH NO VALUE DOES NOT RENDER. An empty row on */
function TrustRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
      <span className="text-ink-2">{label}</span>
      {/* `E433` — a figure, so ink. */}
      <b className="text-ink">{value}</b>
    </div>
  );
}

// Its ONLY caller was the visitor trust card's `Rate` line, which duplicated the `RATES`

/** Integer cents, like every other money value in the app. */
function money(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}
