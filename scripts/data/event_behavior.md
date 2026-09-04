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

**Buyer-facing — the five added in `98f9675`. Names approved by Scott 2026-08-31.**

| Key | Label as shipped |
|---|---|
| `buyer.proposals.received` | Proposals on your work request |
| `buyer.provider.responded` | A provider accepted or declined |
| `buyer.work_order.status` | Your work order status changes |
| `buyer.settlement.approval` | A settlement request needs your approval |
| `buyer.timesheet.approval` | A timesheet needs approving |

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
| `profile.details_needed` | the new user | `Do It` | in-app | ⚠⚠ **RENAMED FROM `profile.details_added` (`P1-J3-E365`, 2026-09-02).** Its CTA is `Do It`, and you do not tell somebody to "do it" about something they already did — the event is a PROMPT TO ADD details, not a confirmation that details WERE added, so the old name described the opposite of its own behaviour. ⚠ **"Details" is now decided: fire when onboarding completes and the profile is below the `SEARCHABLE` bar, naming the missing field.** That set already exists in `identity-bar.ts` — no second definition of "complete". ⚠ **IN-APP ONLY, measured:** `RESEND_API_KEY` is commented out at `.env.local:21`, there is no digest sender, and nothing fires a digest event. Declaring email would put a promise in the registry the build cannot keep. |
| `profile.ready` | the new user | `Do It` | in-app | Maps to `onboarding_completed_at` |
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

## Email templates

Transactional templates live under `src/lib/email/templates/`; sends go through
`src/lib/resend.ts`.

⚠ **A pattern worth reusing before inventing one:** provider validation already
has a working attestation flow one level down, for PROJECTS —
`ProjectValidationStatus`, the client-domain guard
(`brief_validation_domain_guard`), and the `project-validation` /
`project-validated` templates. The provider-validation email should reuse it
rather than start fresh (`decisions-01.md`, `E270`).
