import { readFileSync } from "fs";
import { NOTIFICATION_EMAIL_EVENTS } from "@/lib/notification-email";
import { NOTIFICATION_EVENTS } from "@/lib/notification-events";
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

if (failures.length) {
  console.error(`\ncheck:notification-email — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:notification-email — ${pass}/${pass} passed`);
