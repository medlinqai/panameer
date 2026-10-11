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
  // TWO EVENTS, NOT ONE WITH A FLAG, AND THE REASON IS THE CHANNEL: Scott's
  "profile.visibility_off": {
    event: "profile.visibility_off",
    recipient: "the profile owner",
    category: "profile.visibility",
    aiMode: "REVIEW_IT",
    visibility: "FEED",
    /* It is actionable: buyers cannot find them until they turn it back on. */
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
  // ROW 2 — AND ITS EMAIL IS DELIBERATELY NOT SWITCHED ON
  // THE TWO VALIDATION ANSWERS , lane 3 WS-D)
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
    // Not `requiresAction`: there is nothing they must do, and marking it as a
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
  // declared this event and the registry had no row for it. That harness was
  // Score re-weight (2026-10-06): tells a member who dropped below the search bar exactly what's missing.
  "profile.score_reweight": {
    event: "profile.score_reweight",
    recipient: "members who dropped below the search bar",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: () => "Your Panameer profile needs a few more details",
    body: (v) => `Still needed: ${str(v, "missing", "a few details")}. Searchable profiles need every section filled.`,
    href: () => "/profile",
  },
  "profile.details_needed": {
    event: "profile.details_needed",
    recipient: "the new user",
    category: "profile.visibility",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: () => "Your profile is missing something buyers filter on",
    // THE MISSING FIELD IS NAMED BY THE CALLER, never guessed here — `field`
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
    // CC-AUTHORED COPY — Scott has not seen this sentence and can overrule it.
    body: (v) =>
      `The ${str(v, "pathTitle", "path")} group is now open to you — a private space for the people taking this path, where the instructors answer questions. Ask the one you think is too basic.`,
    href: (v) => (v.pathSlug ? `/learn/${str(v, "pathSlug")}` : "/learn"),
  },
  "learn.path_enrolled.instructor": {
    event: "learn.path_enrolled",
    recipient: "the instructor",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "learnerName", "Someone")} enrolled in ${str(v, "pathTitle", "your path")}`,
    body: () => "Say hello and ask what they hope to get from it.",
    href: (v) => (v.learnerUserId ? `/messages?with=${str(v, "learnerUserId")}` : "/messages"),
  },
  "learn.test_opened": {
    event: "learn.test_opened",
    recipient: "a learner enrolled in the path, or watching its test",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `The ${str(v, "pathTitle", "")} certification test is open`,
    body: () => "Take it when you're ready — pass it and the certificate shows on your profile.",
    href: (v) => (v.pathSlug ? `/learn/${str(v, "pathSlug")}/test` : "/learn"),
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
    // DIGEST, NOT FEED. 522 lessons exist; per-lesson delivery is the single
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
    // THE LEARNER IS NAMED — SCOTT DECIDED IT , 2026-09-02).
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: (v) =>
      `${str(v, "learnerName", "Someone")} finished ${str(v, "courseTitle", "your course")}`,
    body: () => "Ask how it went — what helped and what was missing.",
    href: (v) => (v.learnerUserId ? `/messages?with=${str(v, "learnerUserId")}` : "/messages"),
  },
  "learn.path_completed.learner": {
    event: "learn.path_completed",
    recipient: "the learner",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `You finished every lesson out so far in ${str(v, "pathTitle", "your path")}`,
    body: () => null,
    href: (v) => (v.pathSlug ? `/learn/${str(v, "pathSlug")}` : "/learn"),
  },
  "learn.path_completed.instructor": {
    event: "learn.path_completed",
    recipient: "the instructor",
    category: "learn.progress",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "learnerName", "Someone")} finished ${str(v, "pathTitle", "your path")}`,
    body: () => "Ask what they thought of it — their feedback shapes the next lessons.",
    href: (v) => (v.learnerUserId ? `/messages?with=${str(v, "learnerUserId")}` : "/messages"),
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
    // A BROADCAST TO MANY PEOPLE IS NOT SOMETHING AN AI SENDS UNREVIEWED.
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
    href: () => "/connect/community",
  },
  "message.received": {
    event: "message.received",
    recipient: "the recipient",
    /* REUSES THE SHIPPED CATEGORY, as the spec instructs — do not duplicate. */
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
    href: () => "/connect/community",
  },
  "message.unread": {
    event: "message.unread > N",
    recipient: "—",
    category: "message.received",
    /* RECORDED AS DELIBERATELY SILENT, following MedLinq's precedent. */
    aiMode: "NONE",
    visibility: "SILENT",
    requiresAction: false,
    title: () => "Unread message reminder",
    body: () => null,
  },

  // THE WORKLIST EVENTS , ruling 34e)

  // ── Groups — writers shipped at `P2-A3-E619` ──────────────────────────────
  "group.join_requested": {
    event: "group.join_requested",
    recipient: "the group's owner",
    category: "community.activity",
    /* A person is named to another person, so a human approves. */
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    // WORKLIST. It is cleared by approving or declining — `decideJoinRequest`
    requiresAction: true,
    title: (v) => `${str(v, "askerName", "A member")} asked to join ${str(v, "groupTitle", "your group")}`,
    body: () => "Approve or decline from your Requests.",
    href: () => "/connect/groups?view=requests",
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
    href: (v) => `/connect/groups/${str(v, "groupSlug", "")}`,
  },
  // A DECLINE IS TOLD, NOT SWALLOWED. Ruling 34e puts it on the list for the
  "group.join_declined": {
    event: "group.join_declined",
    recipient: "the member who asked",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `Your request to join ${str(v, "groupTitle", "a group")} wasn't accepted`,
    body: () => "The group's owner decides who joins.",
    href: () => "/connect/groups?view=discover",
  },
  // Catalog: a member-entered term reached CATALOG_NOTIFY_MIN_PEOPLE real people (once per term).
  "catalog.term_catches_on": {
    event: "catalog.term_catches_on",
    recipient: "Panameer catalog admins",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `"${str(v, "term", "A new term")}" is catching on — ${str(v, "people", "3")} members use it`,
    body: (v) => `Members typed this ${str(v, "kind", "skill")} and it isn't in the catalog. Merge it, add it, or reject it in Compare.`,
    href: (v) => `/admin/skill-catalog?tab=compare&q=${encodeURIComponent(str(v, "term", ""))}`,
  },
  // Catalog review (E910): one per admin per day; the count is refreshed as new terms arrive.
  "catalog.review_new": {
    event: "catalog.review_new",
    recipient: "Panameer catalog admins",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "summary", "New skills")} to review`,
    body: () => "Members entered skills or specializations that aren't in the catalog. Merge, add or reject them in Compare.",
    href: () => "/admin/skill-catalog?tab=compare&status=new",
  },
  // Company v3 lane 2: payout account changes reach every admin; a second member prompts a payee switch.
  "company.payout_changed": {
    event: "company.payout_changed",
    recipient: "every admin of the company",
    category: "payout.sent",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "companyName", "Your company")}'s payout account changed`,
    body: (v) => `${str(v, "byName", "An admin")} ${str(v, "change", "changed the payout account")}. If this wasn't expected, check Legal, Tax & Banking now.`,
    href: () => "/company/legal#payout",
  },
  "company.payee_switch_needed": {
    event: "company.payee_switch_needed",
    recipient: "the company's admins",
    category: "payout.sent",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `Switch Who Gets Paid to This company`,
    body: (v) => `${str(v, "companyName", "Your company")} has more than one member now, so one person can't be paid for its work. Switch Who Gets Paid to This company.`,
    href: () => "/company/legal#who-gets-paid",
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
    href: () => "/company/team",
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
  "group.reply_posted": {
    event: "group.reply_posted",
    recipient: "everyone already in the thread (starter + earlier repliers, not the replier)",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "fromName", "Someone")} replied in ${str(v, "threadTitle", "a thread")}`,
    body: (v) => str(v, "groupTitle", "") || null,
    href: (v) => `/connect/groups/thread/${str(v, "threadId", "")}`,
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
    href: (v) => `/connect/groups/thread/${str(v, "threadId", "")}`,
  },

  // ── Colleagues — writers already live in `lib/connections.ts` ─────────────
  "colleague.invite_received": {
    event: "colleague.invite_received",
    recipient: "the person invited",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    /* WORKLIST — cleared by accepting or declining. */
    requiresAction: true,
    title: (v) => `${str(v, "fromName", "Someone")} sent you a connection request`,
    body: () => "Accept or decline in your Requests.",
    // Scott 2026-10-10: it landed on Community with no obvious Accept — go straight to Requests.
    href: () => "/connect/connections?chip=requests",
  },
  // Mentoring needs approval (2026-10-08): the mentor accepts or declines; the asker is told the answer.
  "mentor.request_received": {
    event: "mentor.request_received",
    recipient: "the person asked to mentor",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "fromName", "Someone")} sent you a mentoring request`,
    body: () => "Accept or decline on your Mentors tab.",
    href: () => "/connect/mentors#requests",
  },
  // Scott 2026-10-08: an on-platform colleague asked for a recommendation got no bell item.
  "recommendation.requested": {
    event: "recommendation.requested",
    recipient: "the person asked to write a recommendation",
    category: "community.activity",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "fromName", "Someone")} sent you a recommendation request`,
    body: () => "A few lines about working together. It shows on their profile.",
    href: (v) => str(v, "respondPath", "/connect/recommendations"),
  },
  "learn.path_opened": {
    event: "learn.path_opened",
    recipient: "members who pressed Notify Me on the path",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    /* A worklist info row (Dismiss), per the attention rule. */
    requiresAction: true,
    title: (v) => `${str(v, "pathTitle", "A learning path")} is open — you can start it now`,
    body: () => "You asked to be told when it opened.",
    href: (v) => `/learn/${str(v, "pathSlug", "")}`,
  },
  "follow.received": {
    event: "follow.received",
    recipient: "the person followed",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    /* Attention rule (2026-10-08): on the worklist as a Dismiss-type info row. */
    requiresAction: true,
    title: (v) => `${str(v, "fromName", "Someone")} followed you`,
    body: () => null,
    href: () => "/connect/connections?chip=followers",
  },
  "mentor.request_accepted": {
    event: "mentor.request_accepted",
    recipient: "the person who asked",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "mentorName", "Your mentor")} accepted — they're your mentor now`,
    body: () => null,
    href: () => "/connect/mentors",
  },
  "colleague.invite_accepted": {
    event: "colleague.invite_accepted",
    recipient: "the person who invited",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "fromName", "Someone")} accepted your connection request`,
    body: () => null,
    href: () => "/connect/connections",
  },
  // Split from the accepted-request line (2026-10-08): a non-member signed up from your invitation.
  "invitation.joined": {
    event: "invitation.joined",
    recipient: "the person who sent the invitation",
    category: "community.activity",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "fromName", "Someone")} joined Panameer from your invitation`,
    body: () => null,
    href: () => "/connect/invite",
  },

  // ── The profile ───────────────────────────────────────────────────────────
  // every time somebody glances at your page is the fastest way to get muted
  "profile.viewed": {
    event: "profile.viewed",
    recipient: "the profile's owner",
    category: "profile.visibility",
    aiMode: "DO_IT",
    // SCOTT, 2026-10-01: *"`profile.viewed` → bell."*
    visibility: "FEED",
    requiresAction: false,
    title: (v) => viewedTitle(Number(str(v, "count", "1")) || 1),
    body: () => null,
    href: () => "/usage",
  },

  // DEFINED AND NOT YET CALLED — THE WRITER TEST (ruling 34e)
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
  // THE ONE WORK-CHAIN EVENT WITH A LIVE WRITER
  "work.invited_to_propose": {
    event: "work.invited_to_propose",
    recipient: "the provider invited to propose",
    // THE SIBLING'S CATEGORY, NOT A NEW ONE. `work_request.matched` already
    category: "work_request.matched",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) =>
      `${str(v, "buyerName", "A buyer")} invited you to propose a rate`,
    // The work's own title, or null — never a filler sentence built from
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
    // THE RECIPIENT IS THE PROVIDER — `recipient` says so one line up, and
    href: (v) => `/find-work/${str(v, "requestId", "")}`,
  },
  /** THE PROVIDER IS TOLD A TEST WAS SENT WS-E) */
  "work.test_requested": {
    event: "work.test_requested",
    recipient: "the provider sent a skills test",
    category: "work_request.matched",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false, // R2 builds scheduling/test-taking; until then nothing in-app clears this
    title: (v) => `${str(v, "buyerName", "A buyer")} sent you a skills test`,
    /** THE REQUEST IS NAMED IN THE BODY , never the buyer — see the */
    body: (v) => {
      const t = str(v, "requestTitle", "");
      return t ? `${t} · Reply in Messages to agree the next step.` : "Reply in Messages to agree the next step.";
    },
    // The provider's own route, for the reason recorded on the interview
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
  "work.order_control": {
    event: "work.order_control",
    recipient: "the provider on the order",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "orderNumber", "A work order")}: ${str(v, "done", "status changed")}`,
    body: (v) => `${str(v, "buyerName", "The customer")} ${str(v, "text", "changed this work order.")}`,
    href: (v) => `/orders/${str(v, "orderId", "")}`,
  },
  "work.change_order_received": {
    event: "work.change_order_received",
    recipient: "the provider on the order",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `Change order ${str(v, "revision", "")} on ${str(v, "orderNumber", "a work order")} needs your acknowledgment`,
    body: () => "The current terms stay in force until you accept.",
    href: (v) => `/orders/${str(v, "orderId", "")}#change-order`,
  },
  "work.change_order_decided": {
    event: "work.change_order_decided",
    recipient: "the customer who raised the change order",
    category: "buyer.work_order.status",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) => `${str(v, "providerName", "The provider")} ${str(v, "decision", "answered")} change order ${str(v, "revision", "")} on ${str(v, "orderNumber", "")}`,
    body: (v) => str(v, "note", "") || null,
    href: (v) => `/orders/${str(v, "orderId", "")}#change-order`,
  },
  "estimate.received": {
    event: "estimate.received",
    recipient: "the customer the estimate is for",
    category: "buyer.work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "providerName", "A provider")} sent you an estimate: ${str(v, "title", "")}`,
    body: (v) => `${str(v, "total", "")}${Number(v.revision ?? 1) > 1 ? ` · revision ${str(v, "revision")}` : ""} · Accept, ask for changes or decline.`,
    href: (v) => `/estimates/${str(v, "estimateId", "")}`,
  },
  "estimate.requested": {
    event: "estimate.requested",
    recipient: "the provider asked for an estimate",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "buyerName", "A buyer")} asked for an estimate: ${str(v, "firstLine", "")}`,
    body: () => "Build an estimate, or decline with a reason.",
    href: (v) => `/estimates/requests/${str(v, "requestId", "")}`,
  },
  "estimate.request_declined": {
    event: "estimate.request_declined",
    recipient: "the buyer who asked for the estimate",
    category: "buyer.work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "providerName", "The provider")} declined your estimate request`,
    body: (v) => str(v, "reason", "") || null,
    href: (v) => `/estimates/requests/${str(v, "requestId", "")}`,
  },
  "estimate.accepted": {
    event: "estimate.accepted",
    recipient: "the provider who wrote the estimate",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "customerName", "Your customer")} accepted ${str(v, "title", "your estimate")}`,
    body: () => "A work order is waiting for you to accept its terms.",
    href: (v) => (v.orderId ? `/orders/${str(v, "orderId")}` : `/estimates/${str(v, "estimateId", "")}`),
  },
  "estimate.changes_requested": {
    event: "estimate.changes_requested",
    recipient: "the provider who wrote the estimate",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "customerName", "Your customer")} asked for changes to ${str(v, "title", "your estimate")}`,
    body: (v) => str(v, "comment", "") || null,
    href: (v) => `/estimates/${str(v, "estimateId", "")}`,
  },
  "estimate.declined": {
    event: "estimate.declined",
    recipient: "the provider who wrote the estimate",
    category: "work_order.status",
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: true,
    title: (v) => `${str(v, "customerName", "Your customer")} declined ${str(v, "title", "your estimate")}`,
    body: (v) => str(v, "comment", "") || null,
    href: (v) => `/estimates/${str(v, "estimateId", "")}`,
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
  // DEFINED AND SILENT, AND THIS ONE IS DIFFERENT FROM THE FOUR ABOVE.
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
  // THE EVENT IS THE ANSWER, NOT THE CREATION (ruling 82a). Scott
  "support.ticket_status": {
    event: "support.ticket_status",
    recipient: "the member who reported the ticket",
    category: "support.ticket_status",
    aiMode: "DO_IT",
    visibility: "FEED",
    requiresAction: false,
    title: (v) =>
      `Your support ticket is now ${str(v, "status", "updated")}`,
    // The ticket's own title, so a member with several can tell them apart.
    body: (v) => (str(v, "ticketTitle") ? str(v, "ticketTitle") : null),
    href: (v) =>
      str(v, "ticketId") ? `/support/tickets/${str(v, "ticketId")}` : "/support/tickets",
  },

  // ── Shop — service product offers — P2-A6-E707, rulings 94a / 105d / 106 ───
  // SCOTT NAMED THESE THREE ON 2026-09-29 (`105d`). `106e` corrects the shape
  "shop.offer_received": {
    event: "shop.offer_received",
    recipient: "the seller who owns the service product",
    category: "service_product.offers",
    // A fact about the member's own product. Nothing drafted, nobody named to a
    aiMode: "DO_IT",
    visibility: "FEED",
    // THE SELLER MUST ANSWER — accept or deny, and nothing happens until they
    requiresAction: true,
    title: () => "A buyer made an offer on your service product",
    // The product and the amount, because "which one and how much" is the whole
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
    // A LINE IS SITTING ON THEIR CART AT THE OFFERED AMOUNT AND NOBODY HAS BEEN
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
    // THE CART IS A `WorkRequest` IN `DRAFT` — there is no cart table (ruling
    href: (v) =>
      str(v, "workRequestId") ? `/work-requests/${str(v, "workRequestId")}` : null,
  },
  "shop.offer_denied": {
    event: "shop.offer_denied",
    recipient: "the buyer who made the offer",
    category: "buyer.offers.answered",
    aiMode: "DO_IT",
    visibility: "FEED",
    /* THE BUYER NOW OWES A DECISION — buy at list, offer again, or walk away. */
    requiresAction: true,
    title: () => "Your offer wasn't accepted",
    // THE MESSAGE AND THE FLOOR TRAVEL WITH THE DENIAL (`105d`)
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
    // NULL ON PURPOSE, AND THIS IS THE HONEST ANSWER RATHER THAN THE TIDY ONE.
    href: (v) => (str(v, "serviceProductId", "") ? `/shop/${str(v, "serviceProductId", "")}` : "/shop"),
  },

  // THE WORK TRACKER'S THREE EVENTS , Scott 2026-10-02)
  "work_tracker.shipped": {
    event: "work_tracker.shipped",
    recipient: "everyone following the build",
    category: "work_tracker.updates",
    // human approves. Used where a row names one person to another, or
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
    // human approves. Used where a row names one person to another, or
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
    // human approves. Used where a row names one person to another, or
    aiMode: "SEND_FOR_APPROVAL",
    visibility: "FEED",
    requiresAction: false,
    title: (v: Vars) => `Milestone: ${String(v.title ?? "an update")}`,
    body: (v: Vars) => String(v.description ?? "A milestone on the Work Tracker changed state."),
    href: () => "/status",
  },
} as const satisfies Record<string, NotificationEvent>;

const PLURAL_SECTIONS = /^(skills|rates|certifications|education and languages)$/i;
/** N-E003: older stored titles read "Your Skills was updated"; shown as "Your skills were updated" (display only). */
export function displayTitle(title: string): string {
  const m = /^Your (.+) (was|were) updated$/.exec(title);
  if (!m) return title;
  const noun = m[1] === "How You Work" ? "How You Work section" : m[1].toLowerCase();
  return `Your ${noun} ${PLURAL_SECTIONS.test(noun) ? "were" : "was"} updated`;
}
