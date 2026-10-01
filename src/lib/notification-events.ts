/*
  ── ⚠⚠ RULING 1: THE WORD IS "GROUPS" (`P2-A3-E619` WS-C) ────────────────
  ⚠ SCOTT, 2026-09-22: *"The word is Groups everywhere. **Forum** and **Room**
  disappear from the interface** — the menu, the page, the headings, the
  buttons and the empty states."* ⚠⚠ DATA AND TABLE NAMES STAY (`ForumBoard`,
  `forum_boards`, `forums.ts`); only the words people READ change.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
//   … forum is now open to you — a private room for the people taking this path…
*/
import type { NotificationAiMode, NotificationVisibility } from "@prisma/client";

/**
 * THE EVENT REGISTRY — one entry per (EVENT × RECIPIENT).
 *
 * ⚠⚠ THIS FILE IS DERIVED FROM `scripts/data/event_behavior.md` AND MUST
 * NOT INVENT ROWS. That document is the specification; this is the build. Every
 * ⚠⚠⚠ THE PATH ABOVE WAS STALE AND IS CORRECTED (`P2-A5-E656`). The spec MOVED
 * INTO THE REPO on 2026-09-04 (`P1-ALL-E384`, Scott: *"just move it"*) precisely
 * because a file one level above the git root made these assertions green on one
 * machine and unreproducible from a clean clone. ⚠ `check:notifications` has read
 * `scripts/data/` ever since; only this sentence still pointed at the old home.
 * ⚠⚠ A comment naming a path that does not exist sends the next person to look
 * for a file they will not find — the comment is half the code.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   THIS FILE IS DERIVED FROM `2. Claude Sub-Files/event_behavior.md`
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
  /*
    ── ⚠⚠ `account.finish_later` (`P2-J1.1-E034`) ──────────────────────────────

    SCOTT, 2026-09-06: *"These should be two separate emails. One is start your
    registration...the other is finish the registration you started."*

    ⚠ CATEGORY REUSED, NOT INVENTED. `profile.visibility` is the category
    `account.created` and `account.verified` already use — the same onboarding
    arc, the same recipient, the same "where is my account up to" question. A NEW
    category would have to be reachable from the notification settings page or it
    writes rows nobody can control; `profile.visibility` already is
    (`notification-categories.ts:220`), so nothing is stranded.

    ⚠ `aiMode: DO_IT` and `visibility: FEED` match `account.created` /
    `account.verified` for the same reason. ⚠ `aiMode` IS STORED, NEVER EXECUTED
    — see this file's header.

    ⚠ `requiresAction: false` — the worklist is `E033`'s architecture and out of
    scope. This is a nudge the person already asked for by clicking the button.

    ⚠⚠ THE DEDUPE KEY IS `account.finish_later`, AND PERSON SCOPING IS THE
    INDEX'S JOB — `@@unique([person_id, dedupe_key])`. `Finish later` appears on
    EVERY step by design (`E245`: *"Every step means every step"*), so without
    this a requester who steps out three times receives three identical emails.
  */
  "account.finish_later": {
    event: "account.finish_later",
    recipient: "the new user",
    /*
      ⚠⚠⚠ MOVED OUT OF `profile.visibility` (`P0-E690`, Scott 2026-09-27) ────

      ⚠ It fires from the **requester (BUYER)** wizard, and `profile.visibility`
      is `audience: "seller"` — so the recipient of **Panameer's only live
      notification email** had no row for it in their own settings (`E689(q)`).
      ⚠⚠ **SCOTT RULED IT GETS ITS OWN CATEGORY RATHER THAN WIDENING THAT ONE**,
      because widening puts eight seller-shaped events in front of buyers.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   category: "profile.visibility",
    */
    category: "account.registration",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Continue your registration",
    body: () => "You saved your registration for later. Pick up where you left off.",
    href: () => "/join/requester/steps",
  },
  /*
    ── ⚠⚠⚠ THE PROFILE EVENTS — `P2-A1.1-E741` (A3 rows 1, 3, 4, 5) ──────────

    ⚠ SCOTT, 2026-09-30: *"We need to send a notification (in-app) for all
    profile tasks… show the user when they are logged on and their profile is
    invisible."* He approved the channel table as written.

    ⚠⚠ **RULING 86 GOVERNS: `notify()` IS THE ONE PLACE A NOTIFICATION IS SENT
    FROM, AND NO PROFILE WRITER MAY CALL `sendEmail()` DIRECTLY.** That is the
    two-pipe problem the ruling exists to close.

    ⚠⚠⚠ **ROW 2 (EMAIL / PHONE / PASSWORD CHANGED) IS REGISTERED HERE BUT ITS
    EMAIL IS NOT SWITCHED ON. READ THE NOTE ON `account.credential_changed`.**
  */
  "profile.section_saved": {
    event: "profile.section_saved",
    recipient: "the profile owner",
    category: "profile.updates",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    /* ⚠⚠ THE SECTION IS NAMED IN THE TEXT (ruling 31d), not in a second event.
       ⚠ `section` arrives already humanised from the caller — the mapping from
       a `ProfileSection` key to a member-facing word belongs with the caller
       that knows the key, not in sixteen title functions.
       ⚠⚠⚠ `verb` COMES WITH IT, AND THAT IS NOT PEDANTRY: the first version read
       **"Your Skills was updated"**, because a single template cannot agree with
       both *"Skills"* and *"Photo"*. ⚠ Scott's own example in the brief is
       *"Your Skills were updated"*, so the agreement is part of the spec, not a
       polish item. ⚠⚠ The caller owns it because the caller owns the noun. */
    title: (v) => `Your ${v.section ?? "profile"} ${v.verb ?? "was"} updated`,
    body: () => null,
    href: () => "/profile",
  },
  /*
    ⚠⚠ TWO EVENTS, NOT ONE WITH A FLAG, AND THE REASON IS THE CHANNEL: Scott's
    table gives visibility-OFF an email default of **on** and visibility-ON
    **off**. ⚠⚠⚠ ONE EVENT CANNOT CARRY TWO DEFAULTS, and a `vars`-driven
    branch inside the sender would put the channel decision somewhere the
    settings screen cannot show.
  */
  "profile.visibility_off": {
    event: "profile.visibility_off",
    recipient: "the profile owner",
    category: "profile.visibility",
    aiMode: "REVIEW_IT",
    visibility: "FEED",
    /* ⚠ It is actionable: buyers cannot find them until they turn it back on. */
    requiresAction: true,
    title: () => "Your profile is hidden from buyers",
    body: () =>
      "You turned visibility off. Nothing has been deleted — turn it back on whenever you're ready.",
    href: () => "/profile",
  },
  "profile.visibility_on": {
    event: "profile.visibility_on",
    recipient: "the profile owner",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Your profile is visible to buyers again",
    body: () => null,
    href: () => "/profile",
  },
  "profile.resume_rebuilt": {
    event: "profile.resume_rebuilt",
    recipient: "the profile owner",
    category: "profile.updates",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Your résumé rebuild finished",
    body: (v) =>
      v.summary ? String(v.summary) : "Your profile was updated from your résumé.",
    href: () => "/profile",
  },
  /*
    ── ⚠⚠⚠ ROW 2 — AND ITS EMAIL IS **DELIBERATELY NOT SWITCHED ON** ─────────

    ⚠ Scott's table: *"Email, phone or password changed — on, always (security,
    a rule not a setting)."* ⚠⚠ **MEASURED 2026-10-01 FOR THE DOUBLE-SEND THE
    BRIEF'S PREMISE 3 ASKS ABOUT: `changePassword` (`security-settings.ts:61`)
    SENDS NO EMAIL TODAY.** So this would be a NEW send, not a second one.

    ⚠⚠⚠ **IT IS STILL NOT TURNED ON HERE, AND THAT IS A DELIBERATE STOP.**
    `CLAUDE.md`, 2026-09-29: *"ADDING A KEY TO `NOTIFICATION_EMAIL_EVENTS` IS A
    PRODUCT DECISION, NOT A REFACTOR. It is the one-line diff that turns real
    email on to real members."* ⚠ `MAIL_CAPTURE` **is not set in Vercel at all**,
    so the moment this key is added, production and preview mail real people.
    ⚠⚠ **THE IN-APP ENTRY SHIPS NOW** — ruling 86 makes that unconditional, and
    it is the half that carries no send risk.

    ⚠ **TO TURN THE EMAIL ON, SCOTT ADDS ONE KEY:**
    `"account.credential_changed"` to `NOTIFICATION_EMAIL_EVENTS` in
    `lib/notification-email.ts`. Nothing else changes.
    ⚠⚠ **ITS "ALWAYS" HALF IS ALSO NOT BUILT:** `notify()` reads the member's
    per-category preference, and *"a rule not a setting"* needs a bypass that
    does not exist. ⚠⚠⚠ **REPORTED RATHER THAN INVENTED** — a bypass is the same
    shape as the `PASSWORD_RESET` suppression carve-out, which Scott ruled must
    be ONE named, auditable exemption with a check that fails if any other
    sender claims it.
  */
  "account.credential_changed": {
    event: "account.credential_changed",
    recipient: "the account holder",
    category: "profile.visibility",
    aiMode: "REVIEW_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `Your ${v.credential ?? "sign-in details"} changed`,
    body: () =>
      "If this wasn't you, change your password and contact support straight away.",
    href: () => "/settings/security",
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
  /*
    ── ⚠⚠⚠ `profile.language_defaulted` (`P2-A1.4-E724` item 1b) ─────────────────────────

    ⚠ **SCOTT: the 59 zero-language profiles get one row and an in-app notification —
    *"We added English (Fluent) to your profile. Change it if that's not right."***
    ⚠⚠⚠ **IT CANNOT SEND EMAIL, AND THAT IS CHECKED RATHER THAN ASSUMED.**
    `NOTIFICATION_EMAIL_EVENTS` holds exactly one key — `account.finish_later` — and this is
    not it, so `notify()` writes a row and stops. **Adding a key to that allowlist is a
    product decision; this brief does not touch it.**
    ⚠⚠ **`DO_IT` IS THE HONEST `aiMode`: the system acted on the member's behalf and is
    telling them so.** ⚠ `requiresAction: false` — nothing is broken if they never open it;
    the row they were given is a reasonable default, not a defect awaiting repair.
    ⚠ The `href` points at the one-section editor so *"change it"* is one click, not a hunt.
  */
  /*
    ── ⚠⚠⚠ `profile.country_unknown` (`P2-A1.1-E728` WS-B, ruling 2) ────────────────────

    ⚠ **SCOTT: *"'Other' stays legal: those 7 rows keep it, with a null code, and get the
    next-sign-in prompt."***
    ⚠⚠ **THE DATA IS NOT TOUCHED.** `"Other"` remains in the name column and the code column
    stays `null` — the null IS the flag. This event is how the person is asked to replace it.
    ⚠⚠⚠ **"NEXT SIGN-IN" IS SERVED BY THE NOTIFICATION SURFACE, NOT BY A NEW INTERSTITIAL,
    AND THAT IS A JUDGEMENT I AM FLAGGING.** There is no sign-in-time prompt mechanism in this
    codebase; building one would put a new gate in the auth path **every member passes
    through**, to serve seven rows. The bell is on every page, so they meet it the next time
    they sign in. ⚠ If Scott wants a blocking interstitial, that is its own brief.
    ⚠ **IT CANNOT SEND EMAIL:** `NOTIFICATION_EMAIL_EVENTS` holds only `account.finish_later`.
    ⚠ `requiresAction: true` — unlike the language default, this one IS a gap: nothing can
    resolve a country the standard cannot express except the person who lives there.
  */
  "profile.country_unknown": {
    event: "profile.country_unknown",
    recipient: "the member",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: () => "Which country are you in?",
    body: () =>
      "Your address says \"Other\". Pick your country so buyers can find you and we can check your phone number.",
    href: () => "/settings/contact",
  },
  "profile.language_defaulted": {
    event: "profile.language_defaulted",
    recipient: "the provider",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "We added a language to your profile",
    body: () =>
      "We added English (Fluent) to your profile. Change it if that's not right.",
    href: () => "/profile/edit/languages",
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
      `The ${str(v, "pathTitle", "path")} group is now open to you — a private space for the people taking this path, where the instructors answer questions. Ask the one you think is too basic.`,
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

  /*
    ══ ⚠⚠⚠ THE WORKLIST EVENTS (`P2-A3-E620`, ruling 34e) ═══════════════════

    ⚠ SCOTT, 2026-09-24, accepting the split as proposed. **Worklist** means YOU
    OWE AN ACTION AND IT STAYS UNTIL YOU DO IT; **notification** means you are
    told. ⚠⚠ `requiresAction: true` is the ONLY thing that puts a row on the
    worklist — `/notifications` already filters `requires_action &&
    resolved_at IS NULL`, and the index for that query already exists.

    ⚠⚠⚠ A CORRECTION I OWE, BECAUSE SCOTT RULED ON MY NUMBER. I reported that
    *"every registered event has `requiresAction: false`, so no event in the
    product can create a worklist item at all"*, and ruling 34e's preamble
    repeats it. ⚠⚠ **THAT WAS WRONG. TWO of the 19 already carried it** —
    `profile.details_needed` and `message.received`.
    ⚠ THE CONCLUSION SURVIVES AND THE REASON DOES NOT: the worklist was empty
    because **those two events have produced ZERO ROWS, ever** (measured: 0 and
    0; `Message` holds 0 rows at all), not because nothing was capable. ⚠⚠ I had
    read a row count of `requires_action = 0` and reported it as a fact about
    the REGISTRY — two different questions, and the second one I never asked.
    ⚠⚠⚠ THE GAP IS STILL REAL AND IS STILL WHAT SCOTT'S WALK NOTE FOUND: none of
    the events a member would actually want on a worklist — a group join to
    approve, a colleague invite, a proposal, an interview — was registered at
    all. That is what the entries below fix.

    ── ⚠⚠ WIRED vs DEFINED-AND-SILENT ───────────────────────────────────────
    ⚠ Ruling 34e: *"No event that fires for something the product cannot do
    yet… those ship as definitions that stay silent, never as printed states."*
    ⚠⚠ SO THE SILENCE IS **NOTHING CALLING THEM**, not a `SILENT` visibility:
    these carry `FEED` so that the moment `brief_work_chain` builds their
    writers it calls `notify()` and they work — which is exactly what that brief
    was promised (*"ONE notification writer to call, not invent its own"*).
    ⚠ Each uncalled event says below what has to exist before it can fire.
  */

  // ── Groups — writers shipped at `P2-A3-E619` ──────────────────────────────
  "group.join_requested": {
    event: "group.join_requested",
    recipient: "the group's owner",
    category: "community.activity",
    /* ⚠ A person is named to another person, so a human approves. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    /* ⚠⚠ WORKLIST. It is cleared by approving or declining — `decideJoinRequest`
       is the writer, and it shipped in the same brief that created this state. */
    requiresAction: true,
    title: (v) => `${str(v, "askerName", "A member")} asked to join ${str(v, "groupTitle", "your group")}`,
    body: () => "Approve or decline from your Requests.",
    href: () => "/community/groups?view=requests",
  },
  "group.join_approved": {
    event: "group.join_approved",
    recipient: "the member who asked",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You're in ${str(v, "groupTitle", "the group")}`,
    body: () => null,
    href: (v) => `/community/groups/${str(v, "groupSlug", "")}`,
  },
  /* ⚠⚠ A DECLINE IS TOLD, NOT SWALLOWED. Ruling 34e puts it on the list for the
     same reason `E619` keeps the DECLINED row: a decline the asker never sees
     reads as *"you never asked"*, so they ask again, forever. */
  "group.join_declined": {
    event: "group.join_declined",
    recipient: "the member who asked",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `Your request to join ${str(v, "groupTitle", "a group")} wasn't accepted`,
    /* ⚠⚠⚠ IT NAMES NO REASON AND BLAMES NOBODY. The owner gave none, so
       inventing one would be a fabrication, and *"you were rejected"* is a
       judgement the data does not carry. */
    body: () => "The group's owner decides who joins.",
    href: () => "/community/groups?view=discover",
  },
  "group.question_asked": {
    event: "group.question_asked",
    recipient: "the group's owner",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    /* ⚠⚠ WORKLIST — cleared by answering. This is the same question
       `countThreadsWaitingOn` already counts on the Groups page, so the figure
       and the worklist item cannot disagree about what "waiting" means. */
    requiresAction: true,
    title: (v) => `A question in ${str(v, "groupTitle", "your group")} has no answer yet`,
    body: (v) => str(v, "threadTitle", "") || null,
    href: (v) => `/community/groups/thread/${str(v, "threadId", "")}`,
  },

  // ── Colleagues — writers already live in `lib/connections.ts` ─────────────
  "colleague.invite_received": {
    event: "colleague.invite_received",
    recipient: "the person invited",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    /* ⚠⚠ WORKLIST — cleared by accepting or declining. */
    requiresAction: true,
    title: (v) => `${str(v, "fromName", "Someone")} wants to connect as a colleague`,
    body: () => null,
    href: () => "/community",
  },
  "colleague.invite_accepted": {
    event: "colleague.invite_accepted",
    recipient: "the person who invited",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "fromName", "Someone")} accepted your invitation`,
    body: () => null,
    href: () => "/community/colleagues",
  },

  // ── The profile ───────────────────────────────────────────────────────────
  /* ⚠⚠ `recordProfileView` IS LIVE — measured, it is called from
     `/providers/[id]`. ⚠⚠⚠ AND IT IS `DIGEST`, NOT `FEED`: a bell that rings
     every time somebody glances at your page is the fastest way to get muted,
     which is the reason `learn.lesson_completed` is already DIGEST. The row is
     recorded and the count is what the profile shows. */
  "profile.viewed": {
    event: "profile.viewed",
    recipient: "the profile's owner",
    category: "profile.visibility",
    aiMode: "DO_IT",
    /*
      ── ⚠⚠⚠ `FEED`, NOT `DIGEST` (`P2-A1.1-E737`, Scott's answer 8) ──────────────

      ⚠ **SCOTT, 2026-10-01: *"`profile.viewed` → bell."***
      ⚠⚠ **MEASURED: IT WAS `DIGEST`, SO `notify()` STAMPED `suppressed_reason: "digest"`
      AND LEFT `delivered_in_app_at` NULL — AND THE BELL READS
      `delivered_in_app_at: { not: null }`.** ⚠⚠⚠ **SO TWELVE OF THESE ROWS EXISTED AND NOT
      ONE HAD EVER REACHED ANYBODY'S BELL**, including Scott's own.
      ⚠ **AND THE DIGEST THEY WERE WAITING FOR DOES NOT EXIST** — there is no cron, no
      scheduler and nothing that fires a digest event, which `CLAUDE.md` records as still
      unbuilt. **A row routed to a surface nobody built is a row that is never delivered.**
      ⚠⚠ That is why this is a correction rather than a preference: `DIGEST` named a
      destination, and the destination was never there.
      ⚠ SUPERSEDED, quoted not deleted (`E164`): `visibility: "DIGEST",`
    */
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "viewerName", "Someone")} looked at your profile`,
    body: () => null,
    href: () => "/profile",
  },

  /*
    ══ ⚠⚠⚠ DEFINED AND NOT YET CALLED — THE WRITER TEST (ruling 34e) ════════

    ⚠ MEASURED 2026-09-24: `Proposal` 0 rows · `InterviewRequest` 0 · `WorkOrder`
    0 · `SettlementRequest` 0 · `Payment` 0. ⚠⚠ Every one of these is a real
    model with no writer that a member can reach, so **nothing calls them and no
    row can exist.** ⚠⚠⚠ THEY ARE REGISTERED ANYWAY, ON PURPOSE: `brief_work_chain`
    was promised ONE notification writer to call rather than inventing its own,
    and a registry entry is what makes that a one-line call when its writer lands.
  */
  "work.proposal_received": {
    event: "work.proposal_received",
    recipient: "the buyer who posted the work request",
    category: "buyer.proposals.received",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `A proposal on ${str(v, "requestTitle", "your work request")}`,
    body: () => "Respond from the work request.",
    href: (v) => `/work-requests/${str(v, "requestId", "")}`,
  },
  /*
    ── ⚠⚠⚠ THE ONE WORK-CHAIN EVENT WITH A LIVE WRITER (`P2-A8-E680`) ───────

    ⚠⚠ Every other entry in this block was registered **ahead of** its writer,
    on the reasoning recorded above: *"a registry entry makes that a one-line
    call the day its writer lands."* ⚠⚠⚠ **THIS ONE IS THE OPPOSITE — THE
    WRITER SHIPPED FIRST AND HAD NO EVENT.** `inviteProviders()` has been doing
    `proposalRequest.create` from a reachable page all along, and **the invited
    provider got no bell entry and nothing on their worklist.**

    ⚠ `requiresAction: true` — the invitation IS the work item, and it clears
    when they propose a rate (WS-C). It is the provider's worklist row.

    ⚠⚠⚠ **`href` GOES TO `/find-work/[id]`, AND THE SIBLING ABOVE IS WRONG
    ABOUT THIS.** `work.interview_requested` sends *"the provider asked to
    interview"* to `/work-requests/{id}` — which is `guardPage("canHireTalent")`
    and would bounce that provider to `/dashboard?noaccess=1`. ⚠ Measured, not
    assumed; **reported and NOT fixed here** — that event has no writer, so the
    defect is unreachable, and correcting it is its own change.
    ⚠ `/find-work/invitations` was the other candidate and is a `ComingSoon`
    stub, so linking there would be `E579`. `/find-work/[id]` is
    `canProvideServices` and opens `POSTED` requests — the state an invite is
    sent in.

    ⚠⚠ **NO SENDER (ruling 86).** `notify()` writes the entry; whether this
    also becomes an email is `86c`/`86e` and is Scott's open decision.
  */
  "work.invited_to_propose": {
    event: "work.invited_to_propose",
    recipient: "the provider invited to propose",
    /* ⚠ THE SIBLING'S CATEGORY, NOT A NEW ONE. `work_request.matched` already
       means "work reached you"; an invitation is the strongest form of that,
       and a seventeenth category would be a preference nobody asked for. */
    category: "work_request.matched",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) =>
      `${str(v, "buyerName", "A buyer")} invited you to propose a rate`,
    /* ⚠ The work's own title, or null — never a filler sentence built from
       absence (`67d`). */
    body: (v) => (str(v, "workTitle") ? str(v, "workTitle") : null),
    href: (v) =>
      str(v, "requestId") ? `/find-work/${str(v, "requestId")}` : "/find-work",
  },
  "work.interview_requested": {
    event: "work.interview_requested",
    recipient: "the provider asked to interview",
    category: "work_request.matched",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "buyerName", "A buyer")} asked to interview you`,
    body: () => "Confirm a time to clear this.",
    /*
      ── ⚠⚠⚠ `/find-work/`, NOT `/work-requests/` (`E680(b)`, FIXED BY `E683a`) ─

      ⚠⚠ **THE RECIPIENT IS THE PROVIDER** — `recipient` says so one line up, and
      `requestInterview` notifies `input.providerPersonId`. ⚠⚠⚠ `/work-requests`
      is `guardPage("canHireTalent")`, so this href **sent the provider to a
      buyer-only route and bounced them to `/dashboard?noaccess=1`** — a bell
      entry that cannot be opened by the person it was written for.
      ⚠ **IT WAS FILED AS UNREACHABLE AND DEFERRED ON THAT GROUND** (`E680(b)`,
      2026-09-26): *"that event has no writer, so the defect is unreachable, and
      correcting it is its own change."* ⚠⚠⚠ **WS-E BUILDS THE WRITER'S DOOR, SO
      IT STOPS BEING UNREACHABLE — fixing it is a precondition of shipping WS-E,
      not a separate errand.**
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   href: (v) => `/work-requests/${str(v, "requestId", "")}`,
    */
    href: (v) => `/find-work/${str(v, "requestId", "")}`,
  },
  /**
   * ── ⚠⚠ THE PROVIDER IS TOLD A TEST WAS SENT (`P2-A8-E683a` WS-E) ────────
   *
   * ⚠⚠⚠ **`sendTest` WROTE A `TestRequest` AND TOLD NOBODY.** Measured: zero
   * `notify()` calls in `work-tests.ts`, and no `work.test_*` event existed in
   * this registry at all — the same shape `E680` found on the invite, where the
   * writer shipped ahead of its event.
   * ⚠ Same category as the interview: `work_request.matched` already means
   * *"work reached you"*, and a seventeenth category would be a preference
   * nobody asked for (ruling 37 — call the event that exists).
   * ⚠⚠ `requiresAction` — the test IS the work item, and it clears when they
   * sit it or decline it.
   * ⚠⚠⚠ **NO BUYER NAME IS PASSED BY THE CALLER**, for the reason `E680` records:
   * `buildBuyerIdentity` is the one redaction deciding what a provider may see,
   * and a notification is outside the page that applies it. The fallback *"A
   * buyer"* is true under both visibilities.
   */
  "work.test_requested": {
    event: "work.test_requested",
    recipient: "the provider sent a skills test",
    category: "work_request.matched",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "buyerName", "A buyer")} sent you a skills test`,
    body: () => "Sit it or decline to clear this.",
    /* ⚠ The provider's own route, for the reason recorded on the interview
       event directly above — and checked here rather than copied. */
    href: (v) => `/find-work/${str(v, "requestId", "")}`,
  },
  "work.order_offered": {
    event: "work.order_offered",
    recipient: "the provider offered the work",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: () => "A work order is waiting for you to accept",
    body: (v) => str(v, "requestTitle", "") || null,
    href: (v) => `/orders/${str(v, "orderId", "")}`,
  },
  "work.settlement_approval": {
    event: "work.settlement_approval",
    recipient: "the buyer who owes the approval",
    category: "buyer.settlement.approval",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: () => "A settlement needs your approval",
    body: () => null,
    href: (v) => `/orders/${str(v, "orderId", "")}`,
  },
  /*
    ⚠⚠⚠ DEFINED AND SILENT, AND THIS ONE IS DIFFERENT FROM THE FOUR ABOVE.
    ⚠ Ruling 25 / the standing rule: **no `Payment` row is created ANYWHERE in
    the codebase and `PAID` is never written**, so this cannot fire — and a
    figure or a state derived from it is uncountable, not zero (`E603`'s dash).
    ⚠⚠ It is registered so that whoever finally writes a payment has an event to
    call, and for no other reason. **Do not print a state from it.**
  */
  "payment.sent": {
    event: "payment.sent",
    recipient: "the provider paid",
    category: "payout.sent",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You've been paid${str(v, "amount", "") ? ` — ${str(v, "amount", "")}` : ""}`,
    body: () => null,
    href: () => "/payments",
  },
  /* ⚠ THERE IS NO `Recommendation` MODEL — measured, the table does not exist.
     ⚠⚠ Registered because the CATEGORY `recommendation.received` already ships
     a toggle, and a toggle governing an event that does not exist is the
     mirror image of the defect ruling 13 warned about. */
  "recommendation.received": {
    event: "recommendation.received",
    recipient: "the provider recommended",
    category: "recommendation.received",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "fromName", "Someone")} recommended you`,
    body: () => null,
    href: () => "/profile",
  },

  // ── Support tickets — P2-A5-E656, ruling 82a ──────────────────────────────
  /*
    ⚠⚠⚠ THE EVENT IS THE ANSWER, NOT THE CREATION (ruling 82a). Scott,
    2026-09-25: *"Notifying the creator that they created something tells them
    what they just pressed."* ⚠ `support.ticket_created` is an ECHO — the member
    is looking at the confirmation screen when it would arrive. ⚠⚠ THE STATUS
    CHANGE IS THE ONE THING THEY CANNOT SEE: it happens on Panameer's side, days
    later, while they are somewhere else.

    ⚠ UNLIKE THE WORK-CHAIN BLOCK ABOVE, THIS ONE HAS A LIVE WRITER TODAY —
    `updateTicket` already moves `status`, and there are 3 ticket rows. It is
    registered because it FIRES, not so that it is ready to.
    ⚠⚠ `title` NAMES THE NEW STATUS, so the notification carries the fact rather
    than sending the member to go and look for it — the `53c`/`79a` instinct: a
    line that cannot differ is not a status.
  */
  "support.ticket_status": {
    event: "support.ticket_status",
    recipient: "the member who reported the ticket",
    category: "support.ticket_status",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) =>
      `Your support ticket is now ${str(v, "status", "updated")}`,
    /* ⚠ The ticket's own title, so a member with several can tell them apart.
       Null rather than a filler sentence when it is somehow absent (`67d`: never
       manufacture a value from absence). */
    body: (v) => (str(v, "ticketTitle") ? str(v, "ticketTitle") : null),
    href: (v) =>
      str(v, "ticketId") ? `/support/tickets/${str(v, "ticketId")}` : "/support/tickets",
  },

  // ── Shop — service product offers — P2-A6-E707, rulings 94a / 105d / 106 ───
  /*
    ⚠⚠⚠ SCOTT NAMED THESE THREE ON 2026-09-29 (`105d`). ⚠ `106e` corrects the shape
    and not the content: his table *names categories*, and **the work needs EVENTS
    mapped to categories** — which is what these are. Two categories carry them,
    because one goes to the SELLER and two go to the BUYER and `audience` is one
    value per category (see `notification-categories.ts`).

    ⚠⚠ **THE BUYER AND THE SELLER MUST NOT RECEIVE EACH OTHER'S**, and that is not
    something a count can prove: a test asserting *"one notification exists"* passes
    when it went to the wrong person. ⚠⚠⚠ **`check:offers` ASSERTS `person_id`
    AGAINST THE EXPECTED IDENTITY FOR ALL THREE.**
  */
  "shop.offer_received": {
    event: "shop.offer_received",
    recipient: "the seller who owns the service product",
    category: "service_product.offers",
    /* ⚠ A fact about the member's own product. Nothing drafted, nobody named to a
       third party — so autonomy, not `SEND_FOR_APPROVAL`. */
    aiMode: "DO_IT",
    visibility: "FEED",
    /* ⚠⚠ THE SELLER MUST ANSWER — accept or deny, and nothing happens until they
       do. The worklist is exactly the right place for it, and `/services/offers`
       is a real guarded page rather than a stub. */
    requiresAction: true,
    title: () => "A buyer made an offer on your service product",
    /* ⚠ The product and the amount, because "which one and how much" is the whole
       decision. ⚠⚠ Null rather than a filler sentence if the caller gives neither
       (`67d` — never manufacture a value out of absence). */
    body: (v) => {
      const title = str(v, "productTitle");
      const amount = str(v, "amount");
      if (!title && !amount) return null;
      if (!amount) return title;
      return title ? `${title} — offered ${amount}` : `Offered ${amount}`;
    },
    href: () => "/services/offers",
  },
  "shop.offer_accepted": {
    event: "shop.offer_accepted",
    recipient: "the buyer who made the offer",
    category: "buyer.offers.answered",
    aiMode: "DO_IT",
    visibility: "FEED",
    /* ⚠⚠ A LINE IS SITTING ON THEIR CART AT THE OFFERED AMOUNT AND NOBODY HAS BEEN
       PAID YET — the buy is still owed, so this belongs on the worklist. */
    requiresAction: true,
    title: () => "Your offer was accepted",
    body: (v) => {
      const title = str(v, "productTitle");
      const amount = str(v, "amount");
      if (!title && !amount) return null;
      const what = title || "The service product";
      return amount
        ? `${what} is on your cart at ${amount}.`
        : `${what} is on your cart at the amount you offered.`;
    },
    /* ⚠ THE CART IS A `WorkRequest` IN `DRAFT` — there is no cart table (ruling
       94c), so the buyer's own request page IS the destination. */
    href: (v) =>
      str(v, "workRequestId") ? `/work-requests/${str(v, "workRequestId")}` : null,
  },
  "shop.offer_denied": {
    event: "shop.offer_denied",
    recipient: "the buyer who made the offer",
    category: "buyer.offers.answered",
    aiMode: "DO_IT",
    visibility: "FEED",
    /* ⚠ THE BUYER NOW OWES A DECISION — buy at list, offer again, or walk away. */
    requiresAction: true,
    title: () => "Your offer wasn't accepted",
    /*
      ── ⚠⚠⚠ THE MESSAGE AND THE FLOOR TRAVEL WITH THE DENIAL (`105d`) ─────────

      ⚠⚠ **THE FLOOR IS THE ACTIONABLE PART. BURYING IT ON A PAGE THE BUYER HAS TO
      FIND DEFEATS THE REASON IT EXISTS** — and there is no such page today anyway.
      ⚠⚠⚠ **AND IT IS STILL NOT A QUOTE (`94a`): AN OFFER AT THE FLOOR REMAINS
      DENIABLE. THE SENTENCE THAT SAYS SO SHIPS IN THE SAME BREATH AS THE NUMBER,
      NOT NEAR IT** — a buyer who reads the floor as a promise will feel cheated by
      a legitimate second denial, and that misunderstanding is created by the gap
      between the figure and its caveat.
      ⚠ The seller's own words come first when they gave any; they are the reason,
      and Panameer's framing should not talk over them.
    */
    body: (v) => {
      const parts: string[] = [];
      const said = str(v, "denyMessage");
      if (said) parts.push(said);
      const floor = str(v, "floor");
      if (floor) {
        parts.push(
          `They would consider ${floor} or more. That is guidance, not a quote — a new offer has to clear it and can still be declined.`
        );
      }
      return parts.length > 0 ? parts.join(" ") : null;
    },
    /*
      ⚠⚠⚠ NULL ON PURPOSE, AND THIS IS THE HONEST ANSWER RATHER THAN THE TIDY ONE.
      The buyer's two moves are **buy at list** and **offer again**. ⚠ `/shop` is an
      8-line `ComingSoon` stub and **no buyer-side offer surface exists at all** —
      `makeOffer` is called from nowhere in `src/`, measured 2026-09-29.
      ⚠⚠ **A LINK TO EITHER WOULD BE `E579`: A LIVE DOOR ONTO A WALL**, which is
      worse than no link, because it spends the member's trust to show them nothing.
      ⚠ It becomes non-null the day the buyer's shop surface lands.
    */
    href: () => null,
  },
} as const satisfies Record<string, NotificationEvent>;
