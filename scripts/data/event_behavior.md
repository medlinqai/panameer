# Event Behavior

The system-event spec: what happens when X occurs — notifications, downstream
tasks, emails, any AI handling per event.

> **Status 2026-09-01: SCOTT HAS PICKED IT UP. The channels exist; the first
> events are now defined below, dictated by him while walking `/learn`.**
> Supersedes the 2026-08-31 park (*"you are a little ahead of me. i will get
> there"*), quoted rather than deleted.
>
> ⚠ **THE RULE HE SET:** *"Every transaction should have at least 5
> notifications."* Not five deliveries — see the note under the table.

---

## What exists today

**`NotificationPreference` — one row per person, per category**, each carrying
three independent channel flags: **`in_app` · `email` · `sms`.** Modelled on
Medlinq, at Scott's prompt 2026-08-30: *"It is occurring to me we have not asked
them how they want to be notified (in-app, SMS, email...)."*

### Categories — `src/lib/notification-categories.ts`, verified on `98f9675`

Grouped for display under **Messages · Email Updates · Tax Settings**.

**Seller-facing** (shipped earlier — the file's own comment says everything above
the buyer block *"is written from the SELLER's point of view"*):

| Key | Label as shipped |
|---|---|
| `message.received` | New message from a buyer |
| `work_request.matched` | A work request matches your profile |
| `work_order.status` | Work order status changes |
| `milestone.due` | Milestone and timesheet deadlines |
| `profile.visibility` | Profile and visibility |
| `recommendation.received` | Recommendations and validations |
| `learn.progress` | Learn — courses and certifications |
| `product.updates` | Product news from Panameer |
| `tax.documents` | Tax documents |
| `tax.form_required` | A tax form is required before payout |
| `payout.sent` | Withdrawals and payouts |
| `service_product.offers` | Offers on your service products |

**Buyer-facing — the five added in `98f9675`. Names approved by Scott 2026-08-31.**

| Key | Label as shipped |
|---|---|
| `buyer.proposals.received` | Proposals on your work request |
| `buyer.provider.responded` | A provider accepted or declined |
| `buyer.work_order.status` | Your work order status changes |
| `buyer.settlement.approval` | A settlement request needs your approval |
| `buyer.timesheet.approval` | A timesheet needs approving |
| `buyer.offers.answered` | Answers to your offers |

⚠⚠ **`service_product.offers` AND `buyer.offers.answered` WERE ADDED BY `P2-A6-E707`
(2026-09-29) AND THEIR KEYS ARE CC'S, NOT SCOTT'S.** ⚠ He named the three EVENTS (`105d`);
`106e` is what made clear the categories were a separate naming decision. **Flagged for his
approval — one line each to rename, no migration** (see the block in
`notification-categories.ts`). ⚠ Two rather than one because `audience` is one value per
category and the events split **1 seller / 2 buyer.**

⚠ These are **categories, not events.** Nothing fires them.
⚠ `buyer.work_order.status` and `buyer.settlement.approval` both name a
**`WorkOrder` model that does not exist in the schema** (verified 2026-08-30).

---

## ⚠ Open — three blockers, all filed, none resolved

1. **A buyer cannot open their own notification settings.**
   `settings/notifications` is `guardPage("canProvideServices")`. The buyer
   categories exist and are unreachable by the people they belong to.
2. **`NotificationCategory` has no `audience` field.** Nothing in the model
   separates a buyer row from a seller row, so every list is hand-filtered.
3. **The seller rows default `email: true` against an email system that cannot
   send.** `RESEND_API_KEY` and `EMAIL_FROM` are commented out at
   `.env.local:20-22`. The fix is Scott's own 2026-07-24 `send.medlinq.ai`
   bridge decision — no Resend Pro upgrade needed.

⚠ **SMS is a third flag with no sender behind it either.** Phone verification is
**off by design** (`deployment.md`, brief_P / E019).

---

## Events

**Scott, 2026-09-01, verbatim:** *"Every transaction should have at least 5
notifications. Onboarding... account created, details added, profile ready, you are
validated... Learn has LP enrollment, course registration, lesson completion. Community
has you signed up, you got a message, something has been added..."*

⚠⚠ **THE DISTINCTION THAT MAKES THE RULE WORK: FIVE EVENTS IS NOT FIVE MESSAGES.**
An event is a fact the system records. A delivery is something a person receives.
**Define events generously — every one of these is a real moment worth knowing about —
and let CATEGORY, per-channel PREFERENCE and DIGEST decide what actually reaches
someone.** A rich event log with restrained delivery is how this stays valuable; five
pushes per transaction is how a product gets muted. **Scott set the event rule; the
delivery policy is a separate decision and is NOT yet made.**

### ⚠⚠ THE COLUMN MODEL IS BORROWED FROM MEDLINQ, AT SCOTT'S PROMPT (2026-09-01)

Read `~/Documents/AI CO/Medlinq/medlinq-app/claude/event_behavior.md` and its canonical
spreadsheet `medlinq-app/briefs/medlinq_notification_events.xlsx` (58 rows, 9 categories).
**Four things it does that Panameer's model did not, all adopted below:**

1. ⚠⚠ **AN `AI MODE` PER EVENT — the biggest idea, and the one Panameer most needs.**
   Every event declares what the AI may do on its own: **`Do It`** (autonomous) ·
   **`Review It`** · **`Send for Approval`** (AI drafts, human approves) · **`Pending Group
   Approval`** · **`Delegate to Human`** · **`None`**. In MedLinq **33 of 58 events are
   `Do It`**. **For a product whose pitch is "AI-native", this column IS the governance
   model — it is where autonomy is granted or withheld, event by event, on the record.**
2. **ONE ROW PER (EVENT × RECIPIENT), not per event.** MedLinq's *"Appointment Scheduled"*
   appears twice: to the **Patient** as `Do It`, to the **Provider** as `Review It`.
   **This is exactly the `learn.course_completed` problem — learner and instructor are two
   rows, two messages, two AI Modes.**
3. **EVENTS THAT DELIBERATELY DO NOT NOTIFY ARE STILL RECORDED** — *"Visit Started → None /
   None"*, *"Message left unread > N hours → None / None"*. **A decision not to notify is a
   decision, and writing it down stops it being re-litigated every walk.**
4. **THE SPREADSHEET IS THE SPECIFICATION AND CODE FOLLOWS IT** — MedLinq, verbatim:
   *"When code drifts from the spec, the spec is the authority. Update code to match the
   xlsx, not the other way around."* ⚠ **Whether Panameer adopts an xlsx or keeps this
   markdown table is SCOTT'S CALL and is not made.**

⚠ **MEDLINQ'S CHANNEL POLICY ANSWERS THE VOLUME PROBLEM AND SHOULD BE COPIED:** in-app +
worklist primary · **email sparing** · SMS only for urgent-outside-app · and
**ONE collective "log in to view" email instead of per-event emails.** That is the
discipline that makes "at least 5 notifications" survivable.

---

### Onboarding — `P1-J1.1` / `P1-J1.4`

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `account.created` | the new user | `Do It` | in-app | ⚠ email is the natural channel and **cannot send** |
| `account.verified` | the new user | `Do It` | in-app | The one moment they are guaranteed to be watching |
| `profile.score_reweight` | members who dropped below the search bar | `Do It` | in-app | Sent once (2026-10-06) when the score re-weight took a real member below 80; names exactly what's missing. Emailed. |
| `profile.details_needed` | the new user | `Do It` | in-app | ⚠⚠ **RENAMED FROM `profile.details_added` (`P1-J3-E365`, 2026-09-02).** Its CTA is `Do It`, and you do not tell somebody to "do it" about something they already did — the event is a PROMPT TO ADD details, not a confirmation that details WERE added, so the old name described the opposite of its own behaviour. ⚠ **"Details" is now decided: fire when onboarding completes and the profile is below the `SEARCHABLE` bar, naming the missing field.** That set already exists in `identity-bar.ts` — no second definition of "complete". ⚠ **IN-APP ONLY, measured:** `RESEND_API_KEY` is commented out at `.env.local:21`, there is no digest sender, and nothing fires a digest event. Declaring email would put a promise in the registry the build cannot keep. |
| `account.finish_later` | the new user | `Do It` | **email** | ⚠⚠ **THE ONLY ONBOARDING EVENT WHOSE NATURAL CHANNEL ACTUALLY SENDS** (`P2-J1.1-E034`). Scott, 2026-09-06: *"These should be two separate emails. One is start your registration...the other is finish the registration you started (or saved for later)."* ⚠ FIRES SYNCHRONOUSLY ON THE `Finish later` CLICK — no scheduler, unlike `work-request-draft-reminder`. ⚠⚠ DEDUPED ON `account.finish_later` against `Notification.dedupe_key`: `Finish later` is on EVERY step by design (`E245`), so a requester who steps out three times gets ONE email. ⚠ The rows above say email *"cannot send"* — that was true when written and `P1-ALL-E371` changed it on 2026-09-04. They are left as history, not corrected here. |
| `profile.country_unknown` | the member | `Do It` | in-app | ⚠⚠ **`P2-A1.1-E728` WS-B, Scott 2026-09-30.** Seven rows store `"Other"` as their country, which ISO 3166 cannot express, so their new code column is `null`. **The data is deliberately left as it is** and the person is asked to replace it. ⚠⚠⚠ **"NEXT SIGN-IN" IS SERVED BY THE BELL, NOT A NEW INTERSTITIAL** — there is no sign-in-time prompt in this codebase and adding one would put a gate in the path every member walks, to serve seven rows. A blocking interstitial would be its own brief. ⚠ In-app only: the email allowlist holds one key and this is not it. ⚠ `requiresAction: true` — only the person who lives there can resolve it. |
| `profile.language_defaulted` | the provider | `Do It` | in-app | ⚠⚠ **`P2-A1.4-E724`, Scott 2026-09-30.** 59 of 63 profiles held ZERO languages, so the profile said nothing about a fact every buyer filters on. Each got one row — English · FLUENT — and this notification. ⚠⚠⚠ **IN-APP ONLY, AND CHECKED: `NOTIFICATION_EMAIL_EVENTS` holds only `account.finish_later`, so this writes a row and cannot send mail.** ⚠ `Do It` because the system acted on the member's behalf and is telling them so; `requiresAction: false` because a reasonable default is not a defect awaiting repair. |
| `work_tracker.shipped` | everyone following the build | `Send for Approval` | in-app | ⚠⚠ **`P2-ALL-E758`, Scott 2026-10-02:** *"add followers to the public status page … if you create an account you will get notifications as we progress."* ⚠ Fires when an admin PUBLISHES a Shipped entry — not when one is drafted, because a draft is not news. ⚠⚠⚠ **IN-APP ONLY IN THIS RUN, AND IT IS A DECISION, NOT AN OVERSIGHT: `work_tracker.*` IS DELIBERATELY ABSENT FROM `NOTIFICATION_EMAIL_EVENTS`.** No scheduler exists, so the weekly digest Scott wants is its own lane later; and adding a key to that allowlist is the one-line diff that mails real members from a database that also serves production. ⚠ `Send for Approval` because it BROADCASTS TO MANY, which the `NotificationAiMode` enum's own comment names as the case an AI must not send unreviewed. |
| `work_tracker.gate_passed` | everyone following the build | `Send for Approval` | in-app | ⚠ **`P2-ALL-E758`.** Fires when every criterion of a gate reads Yes or N/A — the definition the public page already uses, so the notice and the page cannot disagree. ⚠⚠ Same channel decision and same reason as `work_tracker.shipped` above. |
| `work_tracker.milestone` | everyone following the build | `Send for Approval` | in-app | ⚠ **`P2-ALL-E758`.** Fires when a published milestone changes state — e.g. `R1 — Public beta` reaching `Done`. ⚠⚠ Same channel decision and same reason as `work_tracker.shipped` above. ⚠ All three share ONE category, `work_tracker.updates`: a person follows *the build*, not *shipped entries*. |
| `profile.ready` | the new user | `Do It` | in-app | Maps to `onboarding_completed_at` |
| `validation.confirmed` | the provider | `Do It` | in-app | ⚠⚠ **`P2-A1.1-E749`, lane 3 WS-D. Scott: *"the provider gets a bell notice on Yes and on No."*** ⚠ Fires when a client contact or an employer contact answers **Yes**, from `respondToValidation` and `respondToEmployerValidation`. ⚠⚠⚠ **TWO EVENTS, NOT ONE WITH A FLAG** — a Yes is news and a No is a quiet fact, and one event with a `vars` branch would hide that difference where the settings screen cannot see it. ⚠ In-app only: it is not on the email allowlist. |
| `validation.declined` | the provider | `Do It` | in-app | ⚠⚠ **`P2-A1.1-E749`, lane 3 WS-D.** ⚠⚠⚠ **IT NEVER CARRIES THE CONTACT'S WORDING OR NAME** — the brief: *"the provider is told kindly, without the contact's wording."* It states what happened and what they can do next; it does not relay a judgement. ⚠ `requiresAction: false` deliberately: there is nothing they MUST do, and marking it as a task would turn somebody else's "no" into a chore on their worklist. |
| `profile.section_saved` | the profile owner | `Do It` | in-app | ⚠⚠ **`P2-A1.1-E741`, A3 row 1. Scott, 2026-09-30, approving the channel table, and ruling 31d: *"Get Notified of Profile Updates… you don't need twenty rows."*** ⚠⚠⚠ **ONE EVENT AND ONE SETTING FOR ALL TWELVE SECTIONS** — title, bio, photo, skills, specializations, rates, work history, projects, certifications, education, languages, company. **NOT ONE PER FIELD:** a save that changes five skills is ONE row, and the section is named in the TEXT. ⚠ Fired from `saveProviderSection`, the one owner-facing save path, AFTER the write succeeds and inside a catch — a notification outage must never become a save outage. ⚠⚠ **DELIBERATELY NOT FIRED FROM THE WIZARD:** `saveProviderStep` walks ten steps during registration, and a bell row per step is noise about something the member is already watching. ⚠ In-app only — it is not on the email allowlist, which is what Scott's "email default off" actually means here. |
| `profile.visibility_off` | the profile owner | `Review It` | in-app | ⚠⚠ **`P2-A1.1-E741`, A3 row 3.** ⚠ `requiresAction: true` — buyers cannot find them until it goes back on, and that is a state only they can resolve. ⚠⚠ **TWO EVENTS, NOT ONE WITH A FLAG**: Scott's table gives OFF an email default of **on** and ON **off**, and one event cannot carry two defaults — a `vars`-driven branch would put the channel decision somewhere the settings screen cannot show it. ⚠ The copy keeps *"Nothing has been deleted"*, which is the single question a provider actually has when their profile stops being findable (`E716`). |
| `profile.visibility_on` | the profile owner | `Do It` | in-app | ⚠ **`P2-A1.1-E741`, A3 row 4.** The quiet half of the pair above; `requiresAction: false` because nothing is owed. |
| `profile.resume_rebuilt` | the profile owner | `Do It` | in-app | ⚠⚠ **`P2-A1.1-E741`, A3 row 5.** Fires ONCE, at the end of the apply, for the whole rebuild — not per skill and not per section, because the thing that happened is one rebuild. ⚠ Its body carries the same counts the on-screen receipt shows, so the bell entry and the screen cannot tell different stories. ⚠ In-app only. |
| `account.credential_changed` | the account holder | `Review It` | in-app | ⚠⚠⚠ **`P2-A1.1-E741`, A3 row 2 — AND ITS EMAIL IS DELIBERATELY NOT SWITCHED ON.** Scott's table reads *"on, always (security, a rule not a setting)"*. ⚠ **MEASURED 2026-10-01 FOR THE DOUBLE-SEND THE BRIEF'S PREMISE 3 ASKS ABOUT: `changePassword` (`security-settings.ts:61`) SENDS NO EMAIL TODAY**, so this would be a NEW send, not a second one. ⚠⚠ **IT IS STILL IN-APP ONLY, BECAUSE `CLAUDE.md` RULES THAT ADDING A KEY TO `NOTIFICATION_EMAIL_EVENTS` IS A PRODUCT DECISION, NOT A REFACTOR** — *"the one-line diff that turns real email on to real members"* — and `MAIL_CAPTURE` is **not set in Vercel at all**. ⚠ **TO TURN IT ON, SCOTT ADDS `"account.credential_changed"` TO THAT ALLOWLIST; nothing else changes.** ⚠⚠ The *"always"* half is also unbuilt: `notify()` reads the member's per-category preference and a rule-not-a-setting bypass does not exist. **Reported rather than invented** — it is the same shape as the `PASSWORD_RESET` suppression carve-out, which Scott ruled must be ONE named, auditable exemption with a check that fails if any other sender claims it. ⚠ **Phone and email changes are NOT wired yet** — only the password writer fires this; the other two have no single owner-facing writer today. |
| `profile.validated` | the new user | `Send for Approval` | in-app | Validation is a claim about a person — **a human grants it** (`E270`) |
| `profile.published` | — | `None` | **none** | ⚠ **DELIBERATELY SILENT — they are looking at the screen that says it.** Recorded so it is not re-asked. |

### Learn — `P1-J3`

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `learn.path_enrolled` | the learner | `Do It` | in-app | |
| `learn.course_registered` | the learner | `Do It` | in-app | |
| `learn.lesson_completed` | the learner | `Do It` | **digest only** | ⚠⚠ **522 lessons. Per-lesson delivery is the single fastest way to get muted.** |
| `learn.course_completed` | **the learner** | `Do It` | in-app | |
| `learn.course_completed` | **the instructor** | `Send for Approval` | in-app | **`P1-J3-E048` — the lead.** ⚠ **Not `Do It`: it discloses a named learner to a third party. Privacy — named / anonymous / opt-in — is Scott's and is undecided.** |
| `learn.certified` | the learner | `Do It` | in-app | Worth the most; couples `Certification` |
| `learn.certified` | the instructor | `Do It` | digest | Their material produced a credential — the strongest sell signal there is |
| `learn.course_published` | **every provider whose skills match the course's tags** | `Send for Approval` | digest | ⚠⚠ **NEW, Scott 2026-09-01: *"force it on the new courses… so we can broadcast the minute it gets released."* THE PAYOFF OF THE SKILL NEXUS (`P1-J3-E046`) — and the FIRST event with a potentially large audience. `Send for Approval`, not `Do It`: a broadcast to many people is not a thing an AI should send unreviewed. Volume, opt-out and digest are mandatory here, not optional.** |

### Community

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `community.joined` | the member | `Do It` | in-app | |
| `message.received` | the recipient | `Do It` | in-app | ⚠ **category already exists — reuse, do not duplicate** |
| `community.content_added` | followers / team | `Do It` | digest | ⚠ **scope undefined: which container, and who is an audience** |
| `message.unread > N` | — | `None` | **none** | ⚠ **Recorded as deliberately silent, following MedLinq's precedent.** |

⚠ **THE EXISTING CATEGORIES ALREADY COVER SOME OF THESE.** `learn.progress` and
`message.received` are shipped. **Map new events onto existing categories before
creating any — a category per event is how a settings page becomes unusable.**

### Groups and colleagues — `P2-A3-E620`, ruling 34e

⚠⚠ **ADDED 2026-09-24.** Scott's walk note `E025` — *"We still have NOTHING in the
notifications bell"* — and the measurement behind it: the bell, the list and the worklist were
all BUILT, and the table held **one row**. ⚠ None of the events a member would actually want
was registered. These are those events.

⚠⚠⚠ **`Worklist` IN THE CHANNEL COLUMN MEANS `requiresAction: true`** — the member OWES an
action and the row stays until it is done, not until it is read. ⚠ Every one names what clears
it, because an item with no clearing writer would sit there forever (`E579` one level down).
⚠⚠ **ALL OF THESE HAVE LIVE WRITERS** — shipped at `P2-A3-E619` or already in `connections.ts`.

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `group.join_requested` | the group's owner | `Send for Approval` | worklist | ⚠ Fires ONLY on a `REQUEST` group, where a decision is genuinely owed. **Cleared by `decideJoinRequest`.** |
| `group.join_approved` | the member who asked | `Do It` | in-app | Nothing is owed by them — they asked and got an answer |
| `group.join_declined` | the member who asked | `Do It` | in-app | ⚠⚠ **TOLD, NOT SWALLOWED.** A decline nobody sees reads as *"you never asked"*. ⚠ It names no reason and blames nobody — the owner gave none |
| `catalog.term_catches_on` | Panameer catalog admins | `Send for Approval` | worklist | Fires once per member-entered term when it reaches CATALOG_NOTIFY_MIN_PEOPLE (default 3) real people. Emailed. |
| `catalog.review_new` | Panameer catalog admins | `Send for Approval` | worklist | One per admin per day when a member saves a skill or specialization not in the catalog; later ones that day update the count, no second email. Cleared when nothing is left to review. |
| `company.payout_changed` | every admin of the company | `Do It` | in-app | Fires on every add or remove of the company's payout account, so a change no admin expected is seen at once. Emailed. |
| `company.payee_switch_needed` | the company's admins | `Send for Approval` | worklist | Fires when a second member is approved while Who Gets Paid is One person. Never switched automatically. |
| `company.join_requested` | the company's admins | `Send for Approval` | worklist | Fires when someone asks to join, including the automatic request when a verified email matches the company's domain. **Cleared by `decideRequest`.** |
| `company.join_approved` | the person who asked | `Do It` | in-app | Nothing is owed — they asked and got an answer |
| `company.join_declined` | the person who asked | `Do It` | in-app | Told, not swallowed; names no reason |
| `group.question_asked` | the group's owner | `Send for Approval` | worklist | ⚠ The same question `countThreadsWaitingOn` counts on the Groups page — one definition. **Cleared by answering.** ⚠⚠ The four general boards are ownerless, so nothing fires |
| `colleague.invite_received` | the person invited | `Send for Approval` | worklist | **Cleared by accepting OR declining** — both end the wait |
| `mentor.request_received` | the person asked to mentor | `Send for Approval` | worklist | **Cleared by accepting, declining, or the asker withdrawing.** Emailed. Kept as a request so a payment step can sit before Accept (R2) |
| `learn.path_opened` | members who pressed Notify Me | `Do It` | worklist | Once per watcher, when the path first has a playable lesson (after an admin lesson save). Emailed |
| `follow.received` | the person followed | `Do It` | worklist | One-way, no approval; one notice per follower (dedupe on the pair). A Dismiss-type worklist row. Emailed (attention rule, 2026-10-08) |
| `group.reply_posted` | everyone already in the thread | `Do It` | worklist | Starter + earlier repliers, never the replier. A new question still goes to the group host (`group.question_asked`). Emailed |
| `mentor.request_accepted` | the person who asked | `Do It` | in-app | A decline is silent, like a colleague decline |
| `invitation.joined` | the person who sent the invitation | `Do It` | in-app | Split from the accepted-request line: a non-member signed up from your invitation |
| `colleague.invite_accepted` | the person who invited | `Do It` | in-app | ⚠ A colleague DECLINE is deliberately silent — that is a judgement this product does not deliver, unlike a group decline, where an owner is administering a room |
| `profile.viewed` | the profile's owner | `Do It` | digest | ⚠⚠ **DIGEST, NOT FEED.** A bell that rings on every glance is the fastest way to get muted — the reason `learn.lesson_completed` is already digest. ⚠ Fires exactly when a view is COUNTED, so the bell and the profile's number cannot disagree |

### The work chain — DEFINED, NOT YET CALLED

⚠⚠⚠ **NOTHING CALLS THESE AND NO ROW CAN EXIST.** Measured 2026-09-24: `Proposal` **0 rows**
· `InterviewRequest` **0** · `WorkOrder` **0** · `SettlementRequest` **0** · `Payment` **0**.
⚠ Ruling 34e: *"no event that fires for something the product cannot do yet… those ship as
definitions that stay silent, never as printed states."*
⚠⚠ **THEY ARE REGISTERED ANYWAY, ON PURPOSE:** `brief_work_chain` was promised ONE notification
writer to call rather than inventing its own, and a registry entry makes that a one-line call
the day its writer lands.

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `work.invited_to_propose` | the provider invited to propose | `Send for Approval` | worklist | ⚠⚠⚠ **THE FIRST EVENT IN THIS TABLE WITH A LIVE, REACHABLE WRITER** — `inviteProviders()` (`work-request-invite.ts:68`) already does `proposalRequest.create` at `:116` from `/work-requests/[id]/invite`, which renders `InviteToPropose`. The other rows below are registered ahead of their writers; this one is catching up to its own. ⚠ Cleared by proposing a rate (WS-C). ⚠⚠ **`href` GOES TO `/find-work/[id]`, NOT `/work-requests/[id]`** — the latter is `canHireTalent`-gated and would bounce the provider it is addressed to, and `/find-work/invitations` is a `ComingSoon` stub, so linking there would be `E579`. `/find-work/[id]` is `canProvideServices` and opens `POSTED` requests, which is exactly the state an invite is sent in. ⚠ **NO SENDER — ruling 86.** `notify()` writes the bell entry; the email half is `86c`/`86e` and is Scott's open decision. |
| `work.proposal_received` | the buyer who posted the work request | `Send for Approval` | worklist | Cleared by responding to the proposal |
| `work.interview_requested` | the provider asked to interview | `Send for Approval` | worklist | Cleared by confirming a time |
| `work.test_requested` | the provider sent a skills test | `Send for Approval` | worklist | ⚠⚠ **THE WRITER SHIPPED WITHOUT AN EVENT** — `sendTest()` (`work-tests.ts`) created a `TestRequest` and told nobody; zero `notify()` calls in that file and no `work.test_*` row here. Registered with its caller in `E683a` WS-E. ⚠ Cleared by sitting the test or declining it |
| `work.order_offered` | the provider offered the work | `Send for Approval` | worklist | Cleared by accepting the order |
| `learn.path_enrolled.instructor` | the instructor | `Do It` | worklist + email | L-E035. One per learner per path (dedupe on path + learner). Row action: Message {First}; Dismiss to clear |
| `work.order_control` | the provider on the order | `Send for Approval` | worklist + email | O-E002: Hold / Release Hold / Freeze / Unfreeze / Close / Reopen / Finally Close by the customer. Dismiss to clear |
| `work.change_order_received` | the provider on the order | `Send for Approval` | worklist + email | O-E003. Cleared by accepting or rejecting the change order |
| `work.change_order_decided` | the customer who raised the change order | `Do It` | in-app | O-E003. Not sent on ERP orders (the ERP gets a ConfirmationRequest) |
| `work.settlement_approval` | the buyer who owes the approval | `Send for Approval` | worklist | Cleared by approving the settlement |
| `payment.sent` | the provider paid | `Do It` | in-app | ⚠⚠⚠ **DIFFERENT FROM THE FOUR ABOVE.** No `Payment` row is created ANYWHERE in the codebase and `PAID` is never written, so a figure derived from this is **uncountable, not zero**. Registered so whoever finally writes a payment has an event to call. **Do not print a state from it.** |
| `recommendation.received` | the provider recommended | `Do It` | in-app | ⚠ **There is no `Recommendation` model** — the table does not exist. Registered because the category `recommendation.received` already ships a toggle, and a toggle governing an event that does not exist is the mirror of the defect ruling 13 warned about |

⚠⚠ **`NotificationCategory` STILL HAS NO `audience` FIELD**, and `learn.course_completed`
needs one: the same event notifies a learner and an instructor with different messages.
**That gap is already filed and is now blocking.**

⚠⚠ **EMAIL CANNOT SEND.** `RESEND_API_KEY` / `EMAIL_FROM` are commented out at
`.env.local:21-22`. **Every row above says in-app for that reason, not by preference.
Nothing here should be designed email-first until a key exists.**

⚠ **In Medlinq the canonical source is a spreadsheet**
(`1. Briefs/*_notification_events.xlsx`) with this file as the framing.
**Whether Panameer does the same is Scott's call, not chat's** — if it does,
point at the sheet from here.

---

### Support tickets — `P2-A5-E656`, ruling 82a

⚠⚠⚠ **THE EVENT IS THE ANSWER, NOT THE CREATION.** Scott, 2026-09-25 (ruling 82a): *"Notifying
the creator that they created something tells them what they just pressed."* ⚠ The obvious
event — *"your ticket was filed"* — is an **echo**: the member is looking at the confirmation
when it would arrive. ⚠⚠ **THE STATUS CHANGE IS THE ONE THING THEY CANNOT SEE**, because it
happens on Panameer's side, days later, while they are somewhere else.

⚠ **AND IT IS THE HALF THAT IS WRITABLE TODAY.** `updateTicket` already exists and already
moves `status`; **nothing needed to be built for this event to have a writer** (counting
rule 1). ⚠⚠ `createTicket` would have needed no new writer either — but ruling 82a spends the
one spec row, registry entry and category on the moment that carries information.

⚠⚠ **RULING 80's PRINCIPLE IS UNTOUCHED AND THIS IS WHERE IT LANDS:** ruling 13 governs a
notification to a **person** about **their own affairs**, so a member muting their own ticket
updates is their business. ⚠ **THE CATEGORY IS THEREFORE NOT `locked`.** ⚠⚠⚠ Contrast the
ADMIN side, which gets **no notification at all** — a queue plus the `Tickets Waiting on Us`
count on `/admin` (`E654`, ruling 80b). **One ticket, two recipients, two different shapes,
and only one of them is a notification.**

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `support.ticket_status` | the member who reported the ticket | `Do It` | in-app + email | ⚠ Fires from `updateTicket` **only when the status actually changes**, never on a priority edit, an assignment or a resolution-note save — a notification that says nothing changed is the echo ruling 82a rejects. ⚠⚠ **`Do It` because it is a statement of fact about the member's own ticket**, with no drafting and no judgement for anybody to review. ⚠⚠⚠ **EMAIL IS ON BECAUSE RULING 34b SAYS EVERY CATEGORY SHIPS ON** — I shipped `email: false` reasoning that `MAIL_CAPTURE` is OFF and `EMAIL_FROM` is live, and **`check:notify-prefs` failed the build and was right**: the gate holds a standing ruling, so the build loses (`check:cert-skills`' case, not `check:rollup`'s). ⚠⚠⚠ **AND THE CONCERN BEHIND MY `false` WAS THEN MEASURED AND WAS FALSE — `notify()` CANNOT SEND EMAIL.** It imports no sender; its own comment reads *"EMAIL AND SMS RECORD INTENT AND DO NOT SEND"*, and no path turns a `Notification` row into mail. ⚠ **SUPERSEDED, quoted not deleted (`E164`):** *"CONSEQUENCE, STATED NOT BURIED: the next status move sends real mail to a real reporter."* ⚠⚠ **THE REAL GAP IS THE INVERSE — `E658`, product-wide:** the settings screen shows Email live for all 17 categories and nothing delivers. ⚠ Deduped per ticket **per status** on `dedupe_key`, so re-saving the same status cannot fan out |

⚠⚠ **NO EVENT FOR A REPLY ON THE THREAD, AND THAT IS A DECISION, NOT AN OMISSION** — the spec's
own rule 3: *"events that deliberately do not notify are still recorded."* ⚠ `addMessage` has a
writer and could carry one; **it is not built because the reply and the status change usually
move together**, and two notifications for one act is how a product gets muted. ⚠ If they are
ever decoupled, that is the row to add.

---

### Shop — service product offers — `P2-A6-E707`, rulings 94a / 105d / 106

⚠⚠⚠ **SCOTT RULED ALL THREE ON 2026-09-29 (`105d`): BELL ALWAYS, EMAIL ON.** ⚠ `106e` corrects
the shape of that ruling and not its content: **`105d`'s table names CATEGORIES, and the work
needs EVENTS** — these three rows, each mapped to a category. **The two files are not
interchangeable.**

⚠⚠ **ONE SELLER EVENT AND TWO BUYER EVENTS, SO THEY CANNOT SHARE ONE CATEGORY.**
`NotificationCategory.audience` exists precisely to stop a buyer being shown seller-shaped rows
(`E689(q)` is the measured harm), so these map to **two** categories following the established
`work_order.status` / `buyer.work_order.status` split. ⚠ **A category is a promise about what is
inside it**, and stretching one across both sides is the shortcut Scott refused for
`account.finish_later`.

⚠⚠⚠ **`shop.offer_received` HAS A WRITER AND NO CALLER, AND THAT IS STATED RATHER THAN IMPLIED.**
`makeOffer` (`service-product-offers.ts:124`) is called from **nowhere in `src/`** — measured
2026-09-29. ⚠ `E700` built the library and `E705` built the seller's room; **the buyer's half of
the flow does not exist**, so this event is correctly wired and **cannot fire yet.** ⚠⚠ That is
`104c`'s shape one step earlier: not *"the flow is built and nobody is told"* but ***"nobody can
start it."*** **Counting rule 1 applies — do not report this event as live.**

| Event | Recipient | AI Mode | Channel | Notes |
|---|---|---|---|---|
| `shop.offer_received` | the seller who owns the service product | `Do It` | in-app + email | ⚠ Fires from `makeOffer` (`service-product-offers.ts:124`), **after** the create — that writer is in no transaction (`106b`), so *"in the same transaction"* was never a question for it. ⚠⚠ **RECIPIENT IS `provider_person_id` AS STAMPED ON THE OFFER, not re-read from the product** — a product changing hands must not re-point an offer at a seller who never saw it, the same reason `E696` stamps commission on the line. ⚠⚠⚠ **`requires_action: true` — the seller MUST answer, and `/services/offers` is a real guarded page, so the worklist entry has somewhere to go.** ⚠ `Do It`: a statement of fact about the member's own product, nothing drafted and nothing to review. ⚠⚠ **NOT ON THE EMAIL ALLOWLIST** — `NOTIFICATION_EMAIL_EVENTS` holds only `account.finish_later`, so this records intent and does not send. Turning it on is a product decision, not a refactor |
| `shop.offer_accepted` | the buyer who made the offer | `Do It` | in-app + email | ⚠⚠⚠ **THE ONE THAT MATTERS, AND THE ONLY ONE WHOSE ROW IS WRITTEN INSIDE A TRANSACTION** (`106a`/`106b`): `acceptOffer` writes a **cart line** at the offered amount, so a lost notification here leaves a **commercial act unannounced.** ⚠ The row goes on the caller's `tx`; the send is handed back and run **after commit.** ⚠⚠ `requires_action: true` — the line is on their cart waiting to be bought, and `/work-requests/{id}` is real and is the buyer's own |
| `shop.offer_denied` | the buyer who made the offer | `Do It` | in-app + email | ⚠⚠⚠ **THE BODY CARRIES THE SELLER'S MESSAGE AND THE FLOOR, AND SAYS IN THE SAME BREATH THAT THE FLOOR IS NOT A QUOTE** (`94a`, `105d`). ⚠ **THE FLOOR IS THE ACTIONABLE PART — burying it on a page the buyer has to find defeats the reason it exists.** ⚠⚠ A buyer who reads the floor as a promise will feel cheated by a legitimate second denial, **so the sentence that prevents that ships with the number, not near it.** ⚠ Fires from `denyOffer` (`:212`), after the update, **no transaction** (`106b`). ⚠⚠⚠ **`href` IS DELIBERATELY NULL: THERE IS NOWHERE TO SEND THEM.** Their two moves are *buy at list* — `/shop` is an 8-line `ComingSoon` stub — and *offer again*, which has no surface at all. **A link to either would be `E579`, a door onto a wall.** It becomes non-null the day the buyer's shop surface exists |

⚠⚠ **NO EVENT FOR `withdrawOffer`, AND THAT IS A DECISION** (the spec's rule 3 — events that
deliberately do not notify are still recorded). ⚠ The buyer pulling their own offer is **the
member acting on their own record**; telling the seller *"something you had not answered is
gone"* is noise about a thing they may never have seen. ⚠⚠ **And ruling 82a's echo test kills the
buyer-facing half outright** — they are looking at the screen that did it.

---

## Email templates

Transactional templates live under `src/lib/email/templates/`; sends go through
`src/lib/resend.ts`.

⚠ **A pattern worth reusing before inventing one:** provider validation already
has a working attestation flow one level down, for PROJECTS —
`ProjectValidationStatus`, the client-domain guard
(`brief_validation_domain_guard`), and the `project-validation` /
`project-validated` templates. The provider-validation email should reuse it
rather than start fresh (`decisions-01.md`, `E270`).
