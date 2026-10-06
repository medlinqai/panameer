import type { NotificationAiMode, NotificationVisibility } from "@prisma/client";

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

/** Scott 2026-10-04: profile views group into one bell line per day. */
export const viewedTitle = (n: number) => `${n} ${n === 1 ? "person" : "people"} viewed your profile today`;

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
  "account.finish_later": {
    event: "account.finish_later",
    recipient: "the new user",
    category: "account.registration",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: () => "Continue your registration",
    body: () => "You saved your registration for later. Pick up where you left off.",
    href: () => "/join/requester/steps",
  },
  "profile.section_saved": {
    event: "profile.section_saved",
    recipient: "the profile owner",
    category: "profile.updates",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
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
  /*
    ── ⚠⚠ THE TWO VALIDATION ANSWERS (`P2-A1.1-E749`, lane 3 WS-D) ───────────

    ⚠ SCOTT'S BRIEF: *"the provider gets a bell notice on Yes and on No."*
    ⚠⚠ **TWO EVENTS, NOT ONE WITH A FLAG.** A `Yes` is news worth celebrating and
    a `No` is a quiet fact the provider has to absorb — one event with a `vars`
    branch would put that difference inside a template where the settings screen
    cannot see it, and a member could not switch one on without the other.
    ⚠⚠⚠ **THE DECLINE NOTICE NEVER CARRIES THE CONTACT'S WORDING OR NAME.** The
    brief: *"the provider is told kindly, without the contact's wording."* It
    says what happened and what they can do; it does not relay a judgement.
  */
  "validation.confirmed": {
    event: "validation.confirmed",
    recipient: "the provider",
    category: "recommendation.received",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${v.subject ?? "Your work"} was validated`,
    body: () => "Someone confirmed it. The badge is on your profile now.",
    href: () => "/profile",
  },
  "validation.declined": {
    event: "validation.declined",
    recipient: "the provider",
    category: "recommendation.received",
    aiMode: "DO_IT",
    visibility: "FEED",
    /* ⚠ Not `requiresAction`: there is nothing they must do, and marking it as a
       task would turn somebody else's "no" into a chore on their worklist. */
    requiresAction: false,
    title: (v) => `${v.subject ?? "Your work"} wasn't confirmed`,
    body: () =>
      "The contact didn't confirm it. Nothing is shown as validated, and you can ask someone else.",
    href: () => "/profile",
  },
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
    aiMode: "NONE",
    visibility: "SILENT",
    requiresAction: false,
    title: () => "Profile published",
    body: () => null,
  },

  // ── Learn — P1-J3 ─────────────────────────────────────────────────────────
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
    body: () => "The group's owner decides who joins.",
    href: () => "/community/groups?view=discover",
  },
  // Company join requests (company-v2 lane 3): domain match → they ask, an admin approves.
  "company.join_requested": {
    event: "company.join_requested",
    recipient: "the company's admins",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "askerName", "Someone")} asked to join ${str(v, "companyName", "your company")}`,
    body: () => "Approve or decline on your company's People tab.",
    href: () => "/company/people",
  },
  "company.join_approved": {
    event: "company.join_approved",
    recipient: "the person who asked",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You're in ${str(v, "companyName", "the company")} on Panameer`,
    body: () => "Your company's page and people are on the Company tab.",
    href: () => "/company",
  },
  "company.join_declined": {
    event: "company.join_declined",
    recipient: "the person who asked",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `Your request to join ${str(v, "companyName", "a company")} wasn't approved`,
    body: () => "The company's admins decide who joins. You can still use Panameer on your own.",
    href: () => "/company",
  },
  "group.question_asked": {
    event: "group.question_asked",
    recipient: "the group's owner",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
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
    title: (v) => viewedTitle(Number(str(v, "count", "1")) || 1),
    body: () => null,
    href: () => "/usage",
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
    requiresAction: false, // R2 builds scheduling/test-taking; until then nothing in-app clears this
    title: (v) => `${str(v, "buyerName", "A buyer")} asked to interview you`,
    body: () => "Reply in Messages to agree a time.",
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
    requiresAction: false, // R2 builds scheduling/test-taking; until then nothing in-app clears this
    title: (v) => `${str(v, "buyerName", "A buyer")} sent you a skills test`,
    /** ⚠⚠ THE REQUEST IS NAMED IN THE BODY (`E802`), never the buyer — see the
     *  note above and the `notify` call in `work-tests.ts`. ⚠ In the body and
     *  not the title because the worklist GROUPS on the title. */
    body: (v) => {
      const t = str(v, "requestTitle", "");
      return t ? `${t} · Reply in Messages to agree the next step.` : "Reply in Messages to agree the next step.";
    },
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
    title: (v) => `A payment request needs your approval${str(v, "amount", "") ? ` — ${str(v, "amount", "")}` : ""}`,
    body: (v) => (str(v, "providerName", "") ? `From ${str(v, "providerName", "")} on ${str(v, "orderNumber", "")}.` : null),
    href: (v) => `/payments/payment-requests/${str(v, "settlementId", "")}`,
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
    body: () => "Panameer has sent your payout.",
    href: (v) => (str(v, "settlementId", "") ? `/payments/payment-requests/${str(v, "settlementId", "")}` : "/payments/payment-requests"),
  },
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
    href: (v) => (str(v, "serviceProductId", "") ? `/shop/${str(v, "serviceProductId", "")}` : "/shop"),
  },

  /*
    ── ⚠⚠⚠ THE WORK TRACKER'S THREE EVENTS (`P2-ALL-E758`, Scott 2026-10-02) ───

    ⚠⚠ **BELL ONLY IN THIS RUN. NONE OF THESE IS ON `NOTIFICATION_EMAIL_EVENTS`,
    AND THAT IS THE DECISION, NOT AN OVERSIGHT.** Scott: no scheduler exists, so
    no weekly digest ships here; and adding a key to that allowlist is the
    one-line diff that mails real members from a database that also serves
    production (ruling 38). The templates are built and inert.

    ⚠ ONE CATEGORY, `work_tracker.updates`, for all three — a person follows "the
    build", not "shipped entries", and three toggles for one decision is three
    ways to be half-subscribed.
  */
  "work_tracker.shipped": {
    event: "work_tracker.shipped",
    recipient: "everyone following the build",
    category: "work_tracker.updates",
    /* ⚠⚠ `SEND_FOR_APPROVAL`, AND THE ENUM'S OWN COMMENT CHOSE IT: *"AI drafts, a
       human approves. Used where a row names one person to another, or
       BROADCASTS TO MANY — neither is a thing an AI should send unreviewed."*
       These three go to every follower. ⚠ `aiMode` is STORED, never executed. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false,
    title: (v: Vars) => `Shipped: ${String(v.title ?? "an update")}`,
    body: (v: Vars) => String(v.body ?? "A new entry is on the Work Tracker."),
    href: () => "/status",
  },
  "work_tracker.gate_passed": {
    event: "work_tracker.gate_passed",
    recipient: "everyone following the build",
    category: "work_tracker.updates",
    /* ⚠⚠ `SEND_FOR_APPROVAL`, AND THE ENUM'S OWN COMMENT CHOSE IT: *"AI drafts, a
       human approves. Used where a row names one person to another, or
       BROADCASTS TO MANY — neither is a thing an AI should send unreviewed."*
       These three go to every follower. ⚠ `aiMode` is STORED, never executed. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false,
    title: (v: Vars) => `${String(v.gate ?? "A gate")} passed`,
    body: (v: Vars) => String(v.gateTitle ?? "Another stage of the build is signed off."),
    href: () => "/status",
  },
  "work_tracker.milestone": {
    event: "work_tracker.milestone",
    recipient: "everyone following the build",
    category: "work_tracker.updates",
    /* ⚠⚠ `SEND_FOR_APPROVAL`, AND THE ENUM'S OWN COMMENT CHOSE IT: *"AI drafts, a
       human approves. Used where a row names one person to another, or
       BROADCASTS TO MANY — neither is a thing an AI should send unreviewed."*
       These three go to every follower. ⚠ `aiMode` is STORED, never executed. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false,
    title: (v: Vars) => `Milestone: ${String(v.title ?? "an update")}`,
    body: (v: Vars) => String(v.description ?? "A milestone on the Work Tracker changed state."),
    href: () => "/status",
  },
} as const satisfies Record<string, NotificationEvent>;
