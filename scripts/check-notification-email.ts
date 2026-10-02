import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import {
  NOTIFICATION_EMAIL_EVENTS,
  PER_EVENT_TEMPLATE_KEYS,
} from "@/lib/notification-email";
import { NOTIFICATION_EVENTS } from "@/lib/notification-events";
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-categories";
import { ROUTE_ACCESS } from "@/lib/route-access";
import { NON_PRODUCTION_ALLOWLIST } from "@/lib/email/non-production-allowlist";

/**
 * ── ⚠⚠⚠ `check:notification-email` — THE SENDER IN THE NOTIFICATION LAYER ───
 *
 * `P0-E689` WS-B. ⚠ Scott's rule is the spec: *"We never want to send multiple
 * emails to the same person for the same event. That is a rule."*
 *
 * ⚠⚠ **WHAT THIS GATE IS FOR:** the sender is one function and `notify()` is its
 * only caller, so the thing that can break is not the arithmetic — it is
 * somebody adding a SECOND send path, removing the allowlist, or trusting a
 * send-shaped success. Those are what is asserted.
 */

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const read = (p: string) => stripComments(readFileSync(p, "utf8"));

const notifications = read("src/lib/notifications.ts");
const allowlistFile = read("src/lib/notification-email.ts");

/* ═══ 1 · ONE SENDER, ONE PLACE (`E585`) ══════════════════════════════════ */

check(
  "1 — notifications.ts sends through the transport, not its own client",
  /from "@\/lib\/resend"/.test(notifications) && !/new Resend\(/.test(notifications)
);
check(
  "1 — there is exactly ONE sendEmail call in the notification layer",
  (notifications.match(/\bsendEmail\(/g) ?? []).length === 1,
  `found ${(notifications.match(/\bsendEmail\(/g) ?? []).length}`
);
/* ⚠⚠ THE IN-APP ROW IS WRITTEN FIRST AND UNCONDITIONALLY (ruling 86). The email
   is a consequence of the row, never a replacement for it — so the send must
   appear AFTER the write in the file, and must take the row's id. */
check(
  "1 — the row is written before the email is attempted",
  notifications.indexOf("notification.create") < notifications.indexOf("sendEmail(") &&
    notifications.indexOf("notification.upsert") < notifications.indexOf("sendEmail(")
);

/* ═══ 2 · THE ALLOWLIST ═══════════════════════════════════════════════════ */

check("2 — an explicit event allowlist exists", /NOTIFICATION_EMAIL_EVENTS/.test(allowlistFile));
check(
  "2 — the sender consults it before sending",
  /notificationEmailAllowed\(/.test(notifications) &&
    notifications.indexOf("notificationEmailAllowed(") < notifications.indexOf("sendEmail(")
);
/* ⚠⚠⚠ `E382`: THE CATEGORY DEFAULTS MAY NOT BE FLIPPED TO MAKE THE SENDER SAFE.
   All 18 categories default `email: true` and NotificationPreference holds zero
   rows, so the allowlist is the ONLY thing standing between this code and
   emailing every member. A sender that read the preference alone would be
   correct-looking and catastrophic. */
check(
  "2 — the preference is consulted as well as the allowlist",
  /wantsEmail/.test(notifications)
);

/* ═══ 3 · A SEND-SHAPED SUCCESS IS NOT A SEND ═════════════════════════════

   ⚠⚠⚠ THIS SECTION EXISTS BECAUSE THE DEFECT WAS REAL AND WAS MINE. The first
   version of the sender stamped `email_sent_at` on a mail `sendEmail` had
   REFUSED — the transport returns `{ id: "refused" }` and `{ id: "suppressed" }`
   without throwing, each documented as *"send-shaped success so every caller's
   success path still runs."* ⚠ Correct for the transport, a trap for the caller.
   ⚠⚠ A stamp that lies is worse than no stamp: the one question the column
   exists to answer would be answered WRONG. */

check(
  "3 — a refused send does not count as sent",
  /"refused"/.test(notifications) && /"suppressed"/.test(notifications)
);
check(
  "3 — and the stamp is released when the mail went nowhere",
  /email_sent_at: null/.test(notifications)
);

/* ═══ 4 · ONE EMAIL PER PERSON PER EVENT, BY CONSTRUCTION ═════════════════ */

/* ⚠ THE CLAIM IS CONDITIONAL — an unconditional stamp is not an exclusion, and
   two callers would both read null and both send. */
check(
  "4 — the stamp is claimed conditionally, so it is an exclusion and not a note",
  /updateMany\(\{[\s\S]{0,200}email_sent_at: null[\s\S]{0,200}data: \{ email_sent_at: new Date\(\) \}/.test(
    notifications
  )
);
check(
  "4 — a lost claim sends nothing",
  /claim\.count === 0/.test(notifications)
);

/* ═══ 5 · THE TRANSPORT'S RAILS ARE NOT RE-IMPLEMENTED AND NOT BYPASSED ═══ */

check(
  "5 — EmailSuppression is not re-implemented in the notification layer",
  !/emailSuppression|isSuppressed\(/.test(notifications)
);
check(
  "5 — UNDELIVERABLE_DOMAINS is not re-implemented either",
  !/UNDELIVERABLE_DOMAINS/.test(notifications)
);
/* ⚠ `check:sent-email` fails if any sender but `password-reset` claims this. */
check(
  "5 — the notification sender does not claim the suppression bypass",
  !/bypassSuppressionFor/.test(notifications)
);

/* ═══ 6 · `E680(b)` — EVERY ALLOWLISTED EVENT'S LINK MUST BE OPENABLE ═════

   ⚠⚠ An `href` can send a member to a page their capability cannot open. This
   walks the allowlist and refuses any event whose destination is gated behind a
   capability, because a notification goes to a PERSON and nothing here knows
   what that person can do. */

/*
  ⚠⚠⚠ THE MATCH IS ON PATH SEGMENTS, NOT ON `startsWith`, AND THE FIRST VERSION
  OF THIS GATE GOT IT WRONG. ⚠ `"/payments".startsWith("/pay")` is TRUE, so
  `payment.sent` — whose destination is `/payments`, gated `authenticated` — was
  reported as requiring `canHireTalent` from the unrelated `/pay` entry.
  ⚠⚠ **THAT IS A FALSE RED ON CORRECT CODE, WHICH §10 CALLS THE MOST EXPENSIVE
  KIND: the cost is not the red, it is that people stop believing the green.**
  ⚠ Caught by reading the gate's own output rather than trusting its verdict.

  ⚠ AND THE LONGEST PREFIX WINS, because `ROUTE_ACCESS` holds both `/find-work`
  (`canProvideServices`) and `/find-work/new` (`canHireTalent`) — reporting the
  shorter one would name the wrong capability in the failure message.
*/
const gated = ROUTE_ACCESS.filter((e) => e.requires !== "authenticated").sort(
  (a, b) => b.prefix.length - a.prefix.length
);
/* ⚠ THE REGISTRY IS `as const satisfies`, so every entry narrows to its OWN
   shape and only SOME carry `href`. Reading through one widened accessor is
   what lets both §6 and §7 ask the same question of every entry — the same
   reason `notify()` widens the spec to `NotificationEvent`. */
const hrefOf = (k: (typeof NOTIFICATION_EMAIL_EVENTS)[number]) =>
  (NOTIFICATION_EVENTS[k] as { href?: (v: never) => string } | undefined)?.href;
const gateFor = (path: string) =>
  gated.find((g) => path === g.prefix || path.startsWith(`${g.prefix}/`));
let hrefChecked = 0;
for (const key of NOTIFICATION_EMAIL_EVENTS) {
  const spec = NOTIFICATION_EVENTS[key] as object | undefined;
  check(`6 — "${key}" is a registered event`, !!spec);
  const href = hrefOf(key);
  if (!href) continue;
  let path = "";
  try {
    path = href({} as never) ?? "";
  } catch {
    check(`6 — "${key}" href renders without vars`, false, "href() threw");
    continue;
  }
  const hit = gateFor(path);
  check(
    `6 — "${key}" links to a page its recipient can open`,
    !hit,
    hit ? `${path} requires ${hit.requires}` : ""
  );
  hrefChecked += 1;
}

/* ═══ 7 · ⚠⚠⚠ `E586` — THE SECTION ABOVE ASSERTED NOTHING, AND IT SAYS SO ══

   ⚠⚠ `E586` is the gate that reported success with no inputs and was quoted as
   green for weeks. §6 is exactly that shape while the allowlist is empty — it
   loops over zero events and passes zero assertions. ⚠⚠⚠ **SO THE EMPTINESS IS
   ASSERTED AND PRINTED RATHER THAN LEFT TO LOOK LIKE COVERAGE.** It does not
   FAIL the gate, because empty is the ruled shipped state and a permanently-red
   gate stops being a gate — but it can never be silently zero. */

check(
  "7 — §6's population equals the allowlist, so it cannot claim absent coverage",
  hrefChecked === NOTIFICATION_EMAIL_EVENTS.filter((k) => !!hrefOf(k)).length
);

/* ═══ REPORT ══════════════════════════════════════════════════════════════ */

if (NOTIFICATION_EMAIL_EVENTS.length === 0) {
  console.log(
    `\n⚠⚠⚠ THE EVENT ALLOWLIST IS EMPTY — §6 ASSERTED NOTHING ABOUT ANY EVENT.\n` +
      `   That is the RULED shipped state (Scott is away; which event goes first is his),\n` +
      `   not a gap to fix. It is printed every run so it cannot read as coverage (E586).\n`
  );
}
if (NON_PRODUCTION_ALLOWLIST.length > 0) {
  console.error(
    `\n⚠⚠⚠ NON_PRODUCTION_ALLOWLIST IS NOT EMPTY (${NON_PRODUCTION_ALLOWLIST.length}). ` +
      `Real addresses can be written to from a preview. Take them out.\n`
  );
  failures.push("NON_PRODUCTION_ALLOWLIST must ship empty");
}

/* ═══ 8 · ⚠⚠⚠ NOTHING SENDS *AND* NOTIFIES FOR THE SAME ACT (`P0-E689` WS-C) ══

   ⚠ Scott, 2026-09-27: *"We never want to send multiple emails to the same
   person for the same event. That is a rule."*

   ⚠⚠ **THE INVARIANT IS MEASURABLE AND WAS ALREADY TRUE ONCE: ZERO FILES CALL
   BOTH `sendEmail()` AND `notify()`.** `CLAUDE.md` records it as measured on
   2026-09-26 by sweeping every `sendEmail` caller. ⚠⚠⚠ **IT WAS TRUE ONLY
   BECAUSE `notify()` COULD NOT SEND. NOW THAT IT CAN, THE SAME SENTENCE IS A
   DOUBLE-SEND GUARD** — and `finish-later` was the one file that broke it.

   ⚠ It is asserted over the whole of `src/` rather than over a list of three
   templates, because **the next double-send will be in a file nobody has
   thought of yet.** ⚠⚠ `lib/notifications.ts` is the one legitimate exception:
   it IS the sender, and it is excluded by name rather than by pattern so the
   exemption is auditable (`check:derived-source`'s shape). */
{
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(dir)) {
      if (e === "node_modules" || e.startsWith(".")) continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.tsx?$/.test(e)) out.push(full);
    }
    return out;
  };
  const THE_SENDER = join("src", "lib", "notifications.ts");

  /*
    ── ⚠⚠⚠ THREE NAMED EXEMPTIONS, EACH MEASURED (`P2-A1.1-E749`, lane 3 WS-D) ─

    ⚠ **THE RULE THIS GUARD PROTECTS IS *"ONE ACT, TWO EMAILS TO ONE PERSON"*,
    AND THE FILE-LEVEL TEST IS AN APPROXIMATION OF IT.** These three send to one
    person and notify a DIFFERENT one, so the approximation misfires.
    ⚠⚠ **EXEMPTED BY NAME, NEVER BY PATTERN** — the shape this file's own comment
    asks for, and `check:derived-source`'s. A pattern would quietly cover the
    next file too.

    ⚠⚠⚠ **AND THE NET GETS TIGHTER, NOT LOOSER: ASSERTION 8b BELOW MAKES IT A
    HARD ERROR FOR ANY EXEMPTED FILE TO FIRE AN ALLOWLISTED EVENT.** That is the
    actual double-send, and it is now impossible in exactly the files where the
    broad heuristic has been switched off.

    ⚠ MEASURED 2026-10-02, recipient by recipient:
      · `recommendations.ts` — emails the RECOMMENDER (asking for one),
        notifies the PROVIDER (that one arrived). Two people.
      · `employer-validation.ts` — emails the CONTACT at the company,
        notifies the PROVIDER. Two people.
      · `project-validation.ts` — ⚠⚠ emails the CONTACT **and** the PROVIDER
        (`project-validated` on a confirm), and notifies the PROVIDER. **This is
        the one that could become a real double-send**, and 8b is what stops it:
        the day `validation.confirmed` is allowlisted without the direct send
        being removed, this gate goes red.
  */
  const DOUBLE_SEND_EXEMPT = [
    join("src", "lib", "recommendations.ts"),
    join("src", "lib", "project-validation.ts"),
    join("src", "lib", "employer-validation.ts"),
  ];

  const files = walk("src").filter((f) => f !== THE_SENDER);
  let both = 0;
  for (const f of files) {
    if (DOUBLE_SEND_EXEMPT.includes(f)) continue;
    const code = stripComments(readFileSync(f, "utf8"));
    if (/\bsendEmail\s*\(/.test(code) && /\bnotify\s*\(\s*\{/.test(code)) {
      both += 1;
      check(`8 — ${f} must not both send and notify`, false, "one act, two emails to one person");
    }
  }
  check("8 — ⚠⚠⚠ zero files both send and notify (the double-send guard)", both === 0, `${both} file(s)`);

  /*
    ⚠⚠⚠ 8b — **THE EXEMPTION CANNOT BECOME A HOLE.** An exempted file may send
    AND notify, but it may NEVER fire an event that is on the email allowlist —
    that is precisely the one-person-two-emails case the guard exists for.
    ⚠ It also fails if an exemption stops being needed, so the list can only
    shrink (`UNCLASSIFIED_PENDING_DECISION`'s rule, applied to a gate).
  */
  for (const f of DOUBLE_SEND_EXEMPT) {
    const code = stripComments(readFileSync(f, "utf8"));
    const sendsAndNotifies =
      /\bsendEmail\s*\(/.test(code) && /\bnotify\s*\(\s*\{/.test(code);
    check(
      `8b — ${f} is still both a sender and a notifier (or drop its exemption)`,
      sendsAndNotifies,
      "an exemption nobody needs is a hole waiting for a new caller"
    );
    const fired = [...code.matchAll(/event:\s*"([a-z0-9_.]+)"/g)].map((m) => m[1]);
    const alsoBranching = [...code.matchAll(/\?\s*"([a-z0-9_.]+)"\s*:\s*"([a-z0-9_.]+)"/g)]
      .flatMap((m) => [m[1], m[2]]);
    const onAllowlist = [...fired, ...alsoBranching].filter((e) =>
      (NOTIFICATION_EMAIL_EVENTS as readonly string[]).includes(e)
    );
    check(
      `8b — ${f} fires NO allowlisted event (the real double-send)`,
      onAllowlist.length === 0,
      onAllowlist.join(", ")
    );
  }
  /* ⚠ `E586` — the sweep must have actually swept. */
  check("8 — the sweep enumerated src/", files.length > 200, `${files.length} file(s)`);
  /* ⚠⚠ AND THE ONE EXEMPTION MUST STILL BE THE SENDER, or the rule above is
     satisfiable by deleting the send from `notifications.ts` entirely. */
  check(
    "8 — the exempted file is still the sender",
    /\bsendEmail\s*\(/.test(notifications) && /notificationEmailAllowed\(/.test(notifications)
  );
}

/* ═══ 9 · SCOTT'S COPY SURVIVES THE MOVE (`P0-E689` WS-C) ═════════════════

   ⚠⚠⚠ **"ONE EMAIL BEFORE, ONE AFTER" IS A CLAIM ABOUT THE MEMBER'S
   EXPERIENCE, NOT ABOUT A NUMBER.** Routing `account.finish_later` through the
   generic row renderer would have kept the count at one and **replaced Scott's
   verbatim copy with the registry's bell paraphrase** — *"Continue your
   registration / Pick up where you left off"* instead of his own words, which
   `finish-later.ts` protects by name. */
{
  const allow = read("src/lib/notification-email.ts");
  check(
    "9 — account.finish_later renders through its OWN template, not the generic one",
    /"account\.finish_later":\s*\(i\)\s*=>/.test(allow) && /finishLaterTemplate\(/.test(allow)
  );
  check(
    "9 — and its receipt names that template, so a bounce can be traced to it",
    /template: "finish-later"/.test(allow)
  );
  /* ⚠ EVERY ALLOWLISTED EVENT IS EITHER GIVEN ITS OWN TEMPLATE OR KNOWINGLY ON
     THE GENERIC ONE — printed, so switching an event on cannot quietly inherit
     wording nobody chose. */
  for (const key of NOTIFICATION_EMAIL_EVENTS) {
    const own = PER_EVENT_TEMPLATE_KEYS.includes(key);
    console.log(`  · ${key} -> ${own ? "its own template" : "the generic row renderer"}`);
  }
}

/* ═══ 10 · THE SCREEN ASKS THE RIGHT QUESTION (`P0-E689` WS-D) ════════════

   ⚠⚠⚠ **SCOTT, 2026-09-27, REJECTING THE PARK:** *"`emailConfigured()` is
   GLOBAL; the allowlist is PER-EVENT. With one event on, the honest screen is
   neither 'email works' nor 'email doesn't' — it is per-category: one sends,
   seventeen record intent. That closes `E658` properly rather than restating it
   — the predicate stops being 'is there a key' and becomes 'is this category's
   event on the allowlist'."* */
{
  const page = read("src/app/(app)/settings/notifications/page.tsx");
  const comp = read("src/components/settings/NotificationSettings.tsx");

  check(
    "10 — the screen asks per category, not once for the whole column",
    /categoryEmailSends\(/.test(page) && /emailSendsFor/.test(comp)
  );
  /* ⚠⚠ THE OLD GLOBAL PROP MUST BE GONE FROM THE COMPONENT'S LOGIC, or both
     predicates exist and the day they disagree the screen lies again (`E585`). */
  check(
    "10 — the single global emailEnabled prop is gone",
    !/emailEnabled/.test(comp),
    "two predicates for one fact is how E658 happened"
  );
  /* ⚠⚠⚠ AND THE GLOBAL FACT IS NARROWED, NOT REPLACED. `E382` says there is ONE
     place that answers "can this build send at all". If `categoryEmailSends`
     stopped calling it, a build with no RESEND_API_KEY would show live toggles. */
  check(
    "10 — the per-category answer still requires the global one (E382)",
    /if \(!emailConfigured\(\)\) return false;/.test(allowlistFile)
  );
  /* ⚠ 86a — IN-APP IS A RULE, NOT A SETTING. The email predicate must never
     reach the in-app column. */
  check(
    "10 — the email predicate only disables the email channel (86a)",
    /channel === "email" && !emailSendsFor\[cat\.key\]/.test(comp) &&
      !/emailSendsFor\[cat\.key\][\s\S]{0,40}inApp/.test(comp)
  );
  /* ⚠ 86e / 90b — SMS stays dark, and its stated reason is now the true one. */
  check(
    "10 — the SMS note names the real reason, not the old false one",
    /text delivery isn/.test(comp) && !/connected in test mode only/.test(comp)
  );
}

/* ═══ 11 · ⚠⚠⚠ CAN THE RECIPIENT SEE THE TOGGLE FOR THE MAIL THEY GET? ═════

   ⚠⚠ **FOUND AT THE WS-D GATE, BY WALKING THE SCREEN AS THE WRONG PERSONA AND
   NOTICING THE ROW WAS ABSENT.** `account.finish_later` fires from the
   **requester (buyer)** wizard, but its category `profile.visibility` is
   `audience: "seller"` — ⚠⚠⚠ **SO THE ONE MEMBER WHO ACTUALLY RECEIVES THE ONE
   LIVE EMAIL HAS NO ROW FOR IT IN THEIR OWN NOTIFICATION SETTINGS.**

   ⚠ **IT IS NOT A TRAP, AND THAT IS WHY THIS PRINTS RATHER THAN FAILS:** the
   email carries a **category-scoped unsubscribe link** (`c=profile.visibility`,
   verified in a captured message), so the member can still stop it. ⚠⚠ But the
   SETTINGS SCREEN — the surface that exists to answer *"what will you send
   me?"* — does not show it to them.

   ⚠⚠ **THE FIX IS A PRODUCT DECISION, NOT A TIDY-UP:** widening
   `profile.visibility` to `audience: "both"` is purely additive (sellers already
   see it) but puts eight seller-shaped events in front of buyers. **Scott's
   call.** Printed every run so it cannot go quiet. */
{
  const cats = NOTIFICATION_CATEGORIES as unknown as {
    key: string;
    audience: string;
  }[];
  const unseen: string[] = [];
  for (const key of NOTIFICATION_EMAIL_EVENTS) {
    const cat = (NOTIFICATION_EVENTS[key] as { category?: string } | undefined)?.category;
    const row = cats.find((c) => c.key === cat);
    if (row && row.audience !== "both") unseen.push(`${key} -> ${cat} (audience: ${row.audience})`);
  }
  check(
    "11 — the audience sweep ran over the allowlist",
    NOTIFICATION_EMAIL_EVENTS.length === 0 || cats.length > 0
  );
  if (unseen.length) {
    console.log(
      `\n⚠⚠⚠ AN ALLOWLISTED EVENT'S CATEGORY IS NOT VISIBLE TO EVERY AUDIENCE:\n` +
        unseen.map((u) => `     ${u}`).join("\n") +
        `\n   A member outside that audience RECEIVES the email and has NO TOGGLE for it.\n` +
        `   The category-scoped unsubscribe link in the mail is their only off switch.\n` +
        `   Widening the audience is a product decision — reported, not guessed.\n`
    );
  }
}

if (failures.length) {
  console.error(`\ncheck:notification-email — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:notification-email — ${pass}/${pass} passed`);
