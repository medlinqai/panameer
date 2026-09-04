import type { NotificationAiMode, NotificationVisibility } from "@prisma/client";

/**
 * THE EVENT REGISTRY — one entry per (EVENT × RECIPIENT).
 *
 * ⚠⚠ THIS FILE IS DERIVED FROM `2. Claude Sub-Files/event_behavior.md` AND MUST
 * NOT INVENT ROWS. That document is the specification; this is the build. Every
 * event in its tables appears here and no others, and `check:notifications`
 * parses those tables and fails the build if the two drift. MedLinq's rule,
 * adopted verbatim: *"When code drifts from the spec, the spec is the authority."*
 *
 * ⚠ ONE ROW PER (EVENT × RECIPIENT), NOT PER EVENT. `learn.course_completed`
 * appears TWICE — to the learner and to the instructor — with different text and
 * different `aiMode`. A notification row is never addressed to two people, so the
 * registry cannot be keyed on the event alone either.
 *
 * ⚠ `aiMode` IS STORED, NEVER EXECUTED. Nothing reads it to decide behaviour. It
 * is the governance record: where autonomy is granted or withheld, on the record,
 * before anything acts.
 */
export type NotificationEventKey = keyof typeof NOTIFICATION_EVENTS;

export type NotificationEvent = {
  /** The spec's Event column — several entries can share one. */
  event: string;
  /** The spec's Recipient column, verbatim enough to match it. */
  recipient: string;
  /** MUST exist in `notification-categories.ts`. `check:notifications` enforces it. */
  category: string;
  aiMode: NotificationAiMode;
  visibility: NotificationVisibility;
  /** True puts the row on the worklist as well as the bell. */
  requiresAction: boolean;
  title: (v: Vars) => string;
  body?: (v: Vars) => string | null;
  href?: (v: Vars) => string | null;
};

/** Loose by design — each event names the handful of keys it actually reads. */
export type Vars = Record<string, string | number | null | undefined>;

const str = (v: Vars, k: string, fallback = "") =>
  v[k] === undefined || v[k] === null ? fallback : String(v[k]);

export const NOTIFICATION_EVENTS = {
  // ── Onboarding — P1-J1.1 / P1-J1.4 ────────────────────────────────────────
  "account.created": {
    event: "account.created",
    recipient: "the new user",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Your Panameer account is created",
    body: () =>
      "Welcome. Everything you do from here is saved as you go.",
    href: () => "/dashboard",
  },
  "account.verified": {
    event: "account.verified",
    recipient: "the new user",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Your email is verified",
    body: () => null,
    href: () => "/dashboard",
  },
  /*
    ── ⚠⚠ `profile.details_needed` (`P1-J3-E365`) ─────────────────────────────

    `check:notifications` was RED on main because `event_behavior.md:129`
    declared this event and the registry had no row for it. That harness was
    working correctly — the drift was real — and its own message states the rule:
    *"An event left UNWIRED still needs its registry row."*

    ⚠⚠ THE NAME CHANGED, AND THAT WAS THE DECISION. The spec called it
    `profile.details_added` with a `Do It` CTA — and you do not tell somebody to
    "do it" about something they already did. It is a PROMPT TO ADD details, not
    a confirmation that details WERE added, so the old name described the
    opposite of its own behaviour. Renamed in `event_behavior.md` too, in the
    same change, or the two would drift again in the other direction.

    ⚠ WHAT "DETAILS" MEANS IS NOW DECIDED, AND IT REUSES A SET THAT EXISTS: fire
    when onboarding completes and the profile is below the `SEARCHABLE` bar
    (`lib/identity-bar.ts`), naming the missing field. Scott, 2026-09-02, on
    where the link should point: *"I would like that link to be somewhere the
    expert is going."* The gap that matters is the one keeping a provider out of
    search — so the href is the profile, not a generic dashboard.
    ⚠ NO SECOND DEFINITION OF "COMPLETE". `SEARCHABLE` is already explained to
    the user by `GateNotice`, so the notification and the refusal agree by
    construction.

    ⚠⚠ IN-APP ONLY, AND THE REASON IS MEASURED, NOT ASSUMED. `RESEND_API_KEY` is
    commented out at `.env.local:21`, there is no digest sender, and nothing in
    the codebase fires a digest event. This is the same three-legged audit that
    corrected the LEARN bar at `P1-ALL-E034`: declaring an email channel here
    would put a promise in the registry that the build cannot keep — precisely
    what that correction exists to prevent.
    ⚠ THE SENDER, THE KEY AND A SCHEDULER ARE NOT BUILT HERE. Email is its own
    brief for when the pipe exists.

    ⚠ `requiresAction: true` — unlike its siblings. This one IS a to-do: it names
    a field the member has to go and fill in, so it belongs on the worklist as
    well as the bell.
  */
  "profile.details_needed": {
    event: "profile.details_needed",
    recipient: "the new user",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: () => "Your profile is missing something buyers filter on",
    /* ⚠ THE MISSING FIELD IS NAMED BY THE CALLER, never guessed here — `field`
       comes from `missingForSearchable()`'s own reason table. */
    body: (v) =>
      str(v, "field")
        ? `${str(v, "field")} — without it you won't come up in search.`
        : "A few fields are still keeping you out of search results.",
    href: () => "/settings/profile",
  },
  "profile.ready": {
    event: "profile.ready",
    recipient: "the new user",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Your profile is ready",
    body: () => "Buyers can find you from here.",
    href: () => "/profile",
  },
  "profile.validated": {
    event: "profile.validated",
    recipient: "the new user",
    category: "profile.visibility",
    /* ⚠ NOT `DO_IT`. Validation is a claim about a person and a human grants it
       (`E270`) — the spec is explicit. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false,
    title: () => "You are validated",
    body: () => null,
    href: () => "/profile",
  },
  "profile.published": {
    event: "profile.published",
    recipient: "—",
    category: "profile.visibility",
    /* ⚠⚠ DELIBERATELY SILENT — the user is looking at the screen that says it.
       Recorded so the decision is not re-litigated on the next walk. */
    aiMode: "NONE",
    visibility: "SILENT",
    requiresAction: false,
    title: () => "Profile published",
    body: () => null,
  },

  // ── Learn — P1-J3 ─────────────────────────────────────────────────────────
  /*
    ⚠⚠ EXTENDED BY `P1-J3-E383` TO SAY THE FORUM IS OPEN. NO SECOND EVENT.

    SCOTT, 2026-09-04: *"ok, as long as the learner gets an email telling them."*

    ⚠ THIS IS A COPY CHANGE, NOT A FEATURE. The event already existed and already
    fires at `api/learn/enroll/route.ts`. ⚠ ONE EVENT PER THING THAT HAPPENED —
    enrolling is ONE action, and firing `community.joined` alongside it would put
    two notifications in front of somebody who did one thing.

    ⚠⚠ AND IT WILL NOT BE AN EMAIL YET, WHICH IS STATED HERE RATHER THAN HIDDEN.
    `RESEND_API_KEY` is commented out, there is no digest sender, and nothing
    fires a digest event (`P1-ALL-E371`). `notify()` will stamp
    `suppressed_reason: "email_not_configured"` and deliver IN-APP ONLY.

    ⚠⚠ NO EMAIL CHANNEL IS DECLARED HERE, DELIBERATELY. Declaring one to make
    this look done is the `P1-ALL-E034` shape — a promise in the registry the
    build cannot keep.

    ⚠ THE GOOD NEWS, AND IT IS WHY THIS COSTS NOTHING TO GET RIGHT: THE CHANNEL
    COMES FROM THE CATEGORY, NOT THE EVENT. `learn.progress` already carries an
    email default. So the day `E371` lands, this becomes an email with NO further
    work — which is why the `body` below is written to be read in an INBOX rather
    than as a toast: it names the path, says what is now open, and stands alone
    without the surrounding page.
  */
  "learn.path_enrolled": {
    event: "learn.path_enrolled",
    recipient: "the learner",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You enrolled in ${str(v, "pathTitle", "a learning path")}`,
    /* ⚠ CC-AUTHORED COPY — Scott has not seen this sentence and can overrule it.
       It says the room is private, because that is the reason it is worth
       reading: a closed forum gets the question somebody thinks is too basic. */
    body: (v) =>
      `The ${str(v, "pathTitle", "path")} forum is now open to you — a private room for the people taking this path, where the instructors answer questions. Ask the one you think is too basic.`,
    href: (v) => (v.pathSlug ? `/learn/${str(v, "pathSlug")}` : "/learn"),
  },
  "learn.course_registered": {
    event: "learn.course_registered",
    recipient: "the learner",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You registered for ${str(v, "courseTitle", "a course")}`,
    body: () => null,
    href: (v) => (v.pathSlug ? `/learn/${str(v, "pathSlug")}` : "/learn"),
  },
  "learn.lesson_completed": {
    event: "learn.lesson_completed",
    recipient: "the learner",
    category: "learn.progress",
    aiMode: "DO_IT",
    /* ⚠⚠ DIGEST, NOT FEED. 522 lessons exist; per-lesson delivery is the single
       fastest way to get muted. The row is still recorded. */
    visibility: "DIGEST",
    requiresAction: false,
    title: (v) => `Lesson complete: ${str(v, "lessonTitle", "a lesson")}`,
    body: () => null,
  },
  "learn.course_completed.learner": {
    event: "learn.course_completed",
    recipient: "the learner",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You finished ${str(v, "courseTitle", "a course")}`,
    body: () => null,
    href: (v) => (v.pathSlug ? `/learn/${str(v, "pathSlug")}` : "/learn"),
  },
  "learn.course_completed.instructor": {
    event: "learn.course_completed",
    recipient: "the instructor",
    category: "learn.progress",
    /*
      ⚠⚠ THE LEARNER IS NAMED — SCOTT DECIDED IT (`P1-J3-E048`, 2026-09-02).

      ⚠ SUPERSEDED, quoted: this said *"Whether it names them, anonymises them or
      requires opt-in is SCOTT'S AND IS UNDECIDED… The copy below therefore does
      NOT name the learner"*, and rendered `Someone finished …`. Withholding the
      name was the right default while it was undecided; it is decided now:
      *"When JOE completes my course, I want to know it. I might want to give him
      an at-a-boy… just build a relationship."* A nameless notification cannot do
      that, which is the whole point of the row.

      ⚠ `SEND_FOR_APPROVAL` IS UNCHANGED, deliberately — the brief says the AI Mode
      stays as the registry has it. What Scott settled is the COPY, not the
      autonomy, and the row still discloses one person to another.
    */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false,
    title: (v) =>
      `${str(v, "learnerName", "Someone")} finished ${str(v, "courseTitle", "your course")}`,
    body: () => null,
  },
  "learn.certified.learner": {
    event: "learn.certified",
    recipient: "the learner",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You earned a certificate in ${str(v, "pathTitle", "a path")}`,
    body: () => null,
    href: () => "/profile",
  },
  "learn.certified.instructor": {
    event: "learn.certified",
    recipient: "the instructor",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "DIGEST",
    requiresAction: false,
    title: (v) => `Your material produced a certificate in ${str(v, "pathTitle", "a path")}`,
    body: () => null,
  },
  "learn.course_published": {
    event: "learn.course_published",
    recipient: "every provider whose skills match the course's tags",
    category: "learn.progress",
    /* ⚠⚠ A BROADCAST TO MANY PEOPLE IS NOT SOMETHING AN AI SENDS UNREVIEWED.
       Digest is mandatory here, not a preference. ⚠ UNWIRED — it depends on the
       skill nexus (`P1-J3-E046`), which does not exist. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "DIGEST",
    requiresAction: false,
    title: (v) => `New course: ${str(v, "courseTitle", "a course in your skills")}`,
    body: () => null,
  },

  // ── Community ─────────────────────────────────────────────────────────────
  "community.joined": {
    event: "community.joined",
    recipient: "the member",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "You joined the community",
    body: () => null,
    href: () => "/community",
  },
  "message.received": {
    event: "message.received",
    recipient: "the recipient",
    /* ⚠ REUSES THE SHIPPED CATEGORY, as the spec instructs — do not duplicate. */
    category: "message.received",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `New message from ${str(v, "senderName", "someone")}`,
    body: () => null,
    href: () => "/messages",
  },
  "community.content_added": {
    event: "community.content_added",
    recipient: "followers / team",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "DIGEST",
    requiresAction: false,
    title: (v) => `New in ${str(v, "containerName", "the community")}`,
    body: () => null,
    href: () => "/community",
  },
  "message.unread": {
    event: "message.unread > N",
    recipient: "—",
    category: "message.received",
    /* ⚠ RECORDED AS DELIBERATELY SILENT, following MedLinq's precedent. */
    aiMode: "NONE",
    visibility: "SILENT",
    requiresAction: false,
    title: () => "Unread message reminder",
    body: () => null,
  },
} as const satisfies Record<string, NotificationEvent>;
