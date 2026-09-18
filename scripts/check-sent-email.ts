/**
 * ── ⚠⚠ THE RECEIPT IS WRITTEN IN THE TRANSPORT (`P2-J3-E522` PART A) ────────
 *
 * ⚠ `E386` put suppression in `sendEmail` so a new sender could not forget it.
 * ⚠⚠ THE RECEIPT CANNOT BE ENFORCED THE SAME WAY — the transport is handed
 * rendered html and CANNOT KNOW which template produced it, or what the mail is
 * about. So enforcement is split:
 *   · `template` is REQUIRED IN THE TYPE, which makes a forgetful sender a
 *     COMPILE ERROR rather than a silent gap;
 *   · this gate holds the parts TypeScript cannot see — that the write lives in
 *     the transport and nowhere else, that it can never fail a send, and that
 *     the senders allowed to omit a subject are NAMED here rather than deciding
 *     for themselves.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const ok = (label: string, cond: boolean, hint?: string) => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { failures.push(label + (hint ? ` — ${hint}` : "")); console.log(`  FAIL  ${label}`); }
};

/** ⚠ Comments are stripped before scanning: the house rule QUOTES superseded
    code (`E164`), and `check:derived-source` was caught by exactly that. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".ts") || p.endsWith(".tsx") ? [p] : [];
  });

const FILES = walk("src");
const TRANSPORT = strip(readFileSync("src/lib/resend.ts", "utf8"));

console.log("\ncheck:sent-email — every send leaves a receipt\n");

/* ═══ 1 · THE WRITE LIVES IN THE TRANSPORT, AND ONLY THERE ═══════════════ */
{
  ok("1 — the transport writes SentEmail", /prisma\.sentEmail\.createMany\(/.test(TRANSPORT));
  const others = FILES.filter((f) => f !== "src/lib/resend.ts")
    .filter((f) => /prisma\.sentEmail\.(create|createMany|upsert)\(/.test(strip(readFileSync(f, "utf8"))));
  ok("1 — ⚠⚠ NO OTHER MODULE WRITES ONE", others.length === 0, others.join(", "));
}

/* ═══ 2 · A RECEIPT MUST NEVER FAIL A SEND ═══════════════════════════════
   ⚠ The mail has already gone. A throw here turns a logging outage into a
   signup outage — worse than the defect the table exists to fix.            */
{
  const m = /const record = async[\s\S]*?\n  \};/.exec(TRANSPORT);
  ok("2 — the recorder exists", Boolean(m));
  ok("2 — ⚠⚠ IT CATCHES ITS OWN FAILURE", Boolean(m && /catch\s*\(/.test(m[0])),
     "an uncaught receipt write can fail a send that already succeeded");
  ok("2 — ⚠ and it does not rethrow", Boolean(m && !/catch[\s\S]*?\bthrow\b/.test(m[0])));
}

/* ═══ 3 · EVERY SENDER NAMES ITSELF ══════════════════════════════════════
   ⚠ `template` is required in the type, so this is belt-and-braces — it also
   catches a sender that passes a VARIABLE, which would defeat the point of a
   name that can be grouped by.                                              */
{
  const callers = FILES.filter((f) => f !== "src/lib/resend.ts")
    .filter((f) => /\bsendEmail\(\{/.test(strip(readFileSync(f, "utf8"))));
  ok("3 — senders found", callers.length >= 10, `found ${callers.length}`);
  const unnamed = callers.filter((f) => {
    const src = strip(readFileSync(f, "utf8"));
    const calls = src.match(/\bsendEmail\(\{[\s\S]*?\n\s*\}\)/g) ?? [];
    return calls.some((c) => !/template:\s*"[a-z0-9-]+"/.test(c));
  });
  ok("3 — ⚠⚠ EVERY sendEmail NAMES ITS TEMPLATE AS A LITERAL", unnamed.length === 0, unnamed.join(", "));
}

/* ═══ 4 · WHO MAY OMIT A SUBJECT — NAMED HERE, NOT DECIDED PER CALLER ════
   ⚠⚠ SCOTT, 2026-09-17: subject_type/subject_id are "NOT OPTIONAL… the webhook
   can only match back by email + template, which is ambiguous the moment two
   invitations go to the same address."
   ⚠ The columns are NULLABLE because a few sends are genuinely about no row.
   ⚠⚠ THIS LIST IS THE WHOLE EXEMPTION. Adding to it is a decision someone has
   to make in this file, in a diff, on purpose.                               */
{
  const MAY_OMIT_SUBJECT = ["finish-later"];
  const offenders: string[] = [];
  for (const f of FILES.filter((x) => x !== "src/lib/resend.ts")) {
    const src = strip(readFileSync(f, "utf8"));
    for (const c of src.match(/\bsendEmail\(\{[\s\S]*?\n\s*\}\)/g) ?? []) {
      const name = /template:\s*"([a-z0-9-]+)"/.exec(c)?.[1];
      if (!name || MAY_OMIT_SUBJECT.includes(name)) continue;
      if (!/subjectType:\s*"/.test(c) || !/subjectId:/.test(c)) offenders.push(`${name} (${f})`);
    }
  }
  ok("4 — ⚠⚠ EVERY OTHER SENDER SAYS WHAT THE MAIL IS ABOUT", offenders.length === 0, offenders.join(", "));
  ok("4 — the exemption list is exactly one entry", MAY_OMIT_SUBJECT.length === 1);
}

/* ═══ 5 · THE SHAPE THE WEBHOOK WILL DEPEND ON ═══════════════════════════ */
{
  const schema = readFileSync("prisma/schema.prisma", "utf8");
  const model = /model SentEmail \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? "";
  ok("5 — the model exists", model.length > 0);
  ok("5 — ⚠⚠ resend_message_id IS NOT UNIQUE (one row PER RECIPIENT)",
     /resend_message_id\s+String\?/.test(model) && !/resend_message_id\s+String\?\s+@unique/.test(model),
     "a batch send returns ONE id; a unique would reject its second recipient");
  ok("5 — it is indexed with the recipient, which is how the webhook matches",
     /@@index\(\[resend_message_id, to_email\]\)/.test(model));
  ok("5 — ⚠ bounce_type is a SEPARATE field from status",
     /\bbounce_type\s+String\?/.test(model) && /\bstatus\s+String\s/.test(model));
  ok("5 — ⚠⚠ DELETING A USER DELETES THEIR RECEIPTS (Scott's cascade ruling)",
     /user\s+User\?\s+@relation\([^)]*onDelete:\s*Cascade/.test(model));
  ok("5 — ⚠ status is NOT an enum — Resend owns that vocabulary",
     !/status\s+SentEmailStatus/.test(model));
}

/* ═══ 6 · THE INVISIBLE FAILURE THIS TABLE EXISTS FOR ════════════════════
   ⚠⚠ A suppressed send returns SUCCESS by design (`E386`). Without a row,
   NOTHING anywhere records that the mail did not go. Scott: "A send that never
   happened and never bounced is the exact invisible failure this brief exists
   to kill."                                                                  */
{
  ok("6 — ⚠⚠ A SUPPRESSED SKIP IS RECORDED", /status:\s*"suppressed"/.test(TRANSPORT));
  ok("6 — a refused send is recorded before the throw",
     /status:\s*"failed"/.test(TRANSPORT) &&
     TRANSPORT.indexOf('status: "failed"') < TRANSPORT.indexOf("Resend failed to send email"));
  ok("6 — ⚠ capture is recorded as `captured`, never as sent", /status:\s*"captured"/.test(TRANSPORT));
}

/* ═══ 7 · THE WEBHOOK (`P2-J3-E522` PART A, 2 of 2) ══════════════════════ */
{
  const ROUTE = "src/app/api/webhooks/resend/route.ts";
  const W = strip(readFileSync(ROUTE, "utf8"));
  ok("7 — the route exists at /api/webhooks/resend", W.length > 0);
  ok("7 — ⚠⚠ THE SIGNATURE IS VERIFIED", /webhooks\.verify\(/.test(W));
  ok(
    "7 — ⚠⚠ OVER THE RAW BODY, NEVER request.json()",
    /await request\.text\(\)/.test(W) && !/request\.json\(\)/.test(W),
    "the signature covers the exact bytes Resend sent; re-serialising breaks it"
  );
  ok("7 — ⚠ no secret means REFUSE, not trust", /if \(!secret\)[\s\S]{0,200}?503/.test(W));
  ok("7 — ⚠ a bad signature is 401 and leaks no reason", /status: 401/.test(W));
  for (const e of ["email.bounced", "email.complained", "email.failed", "email.suppressed"])
    ok(`7 — handles ${e}`, W.includes(`"${e}"`));
  ok(
    "7 — ⚠⚠ email.delivered IS NOT HANDLED (high volume, nothing actionable)",
    !/"email\.delivered"/.test(W)
  );
  ok(
    "7 — ⚠⚠ AN UNHANDLED EVENT RETURNS 200, so Resend does not retry it forever",
    /ignored: type/.test(W)
  );
  ok(
    "7 — ⚠⚠ MATCHED ON THE PAIR, NOT THE ID ALONE",
    /resend_message_id: messageId[\s\S]{0,120}?to_email: \{ in: recipients \}/.test(W),
    "a batch shares one id; matching on it alone marks every recipient bounced"
  );
  ok("7 — ⚠ bounce_type is written from the event", /bounce_type: bounceType/.test(W));
  ok(
    "7 — ⚠⚠ ONLY A `Permanent` BOUNCE SUPPRESSES",
    /bounceType === "Permanent"[\s\S]{0,200}?suppress\(email, null, "bounce"\)/.test(W),
    "a Transient bounce is a full mailbox; suppressing on it locks people out"
  );
  ok("7 — ⚠ a complaint always suppresses", /suppress\(email, null, "complaint"\)/.test(W));
}

/* ═══ 8 · THE SUPPRESSION BYPASS — ONE SENDER, NAMED ═════════════════════
   ⚠⚠ Scott, 2026-09-17: "ONE named, auditable exemption for PASSWORD_RESET,
   and a check that FAILS if any other sender claims it."                     */
{
  const U = strip(readFileSync("src/lib/unsubscribe.ts", "utf8"));
  ok("8 — isSuppressed takes a named bypass", /bypassFor\?: "password-reset"/.test(U));
  ok(
    "8 — ⚠⚠⚠ A HARD BOUNCE IS NEVER BYPASSED",
    /OVERRIDABLE_REASONS = \["unsubscribe_link", "complaint"\]/.test(U) &&
      !/OVERRIDABLE_REASONS = \[[^\]]*bounce/.test(U),
    "re-sending to a dead address achieves nothing and damages the sending domain"
  );
  ok(
    "8 — ⚠ the reasons are matched EXPLICITLY, not as `not a bounce`",
    /OVERRIDABLE_REASONS\.includes\(row\.reason\)/.test(U),
    "so a NEW reason added later is respected by default rather than bypassed"
  );

  const claimants: string[] = [];
  for (const f of FILES.filter((x) => x !== "src/lib/resend.ts")) {
    const src = strip(readFileSync(f, "utf8"));
    for (const c of src.match(/\bsendEmail\(\{[\s\S]*?\n\s*\}\)/g) ?? []) {
      if (!/bypassSuppressionFor/.test(c)) continue;
      const name = /template:\s*"([a-z0-9-]+)"/.exec(c)?.[1];
      if (name !== "password-reset") claimants.push(`${name ?? "?"} (${f})`);
    }
  }
  ok("8 — ⚠⚠ NO OTHER SENDER CLAIMS THE EXEMPTION", claimants.length === 0, claimants.join(", "));

  const resetClaims = /bypassSuppressionFor: "password-reset"/.test(
    strip(readFileSync("src/lib/password-reset.ts", "utf8"))
  );
  ok("8 — ⚠ and the reset sender DOES claim it", resetClaims,
     "otherwise a suppressed address is a permanent, unexplained lockout");
}

/* ═══ 9 · THE READ SIDE — THE BADGE THE BRIEF EXISTS FOR ════════════════ */
{
  const PAGE = strip(readFileSync("src/app/(app)/invite-colleague/page.tsx", "utf8"));
  const CLIENT = strip(readFileSync("src/components/console/InviteColleagueClient.tsx", "utf8"));

  ok("9 — the page reads SentEmail for the invitation", /subject_type: "ColleagueInvite"/.test(PAGE));
  /* ⚠ THE MODEL BLOCK IS EXTRACTED FIRST. A lazy `[\s\S]*?` from the model name
     to the next `\n}` does NOT stop at this model's closing brace — it runs on
     into `SentEmail`, finds `bounce_type` there and reports a column that does
     not exist. ⚠⚠ Measured: this assertion was RED for exactly that reason. */
  const inviteModel = /model ColleagueInvite \{[\s\S]*?\n\}/.exec(
    readFileSync("prisma/schema.prisma", "utf8")
  )?.[0] ?? "";
  ok("9 — the ColleagueInvite model was found", inviteModel.length > 0);
  ok(
    "9 — ⚠⚠ DERIVED, NOT DENORMALISED — no bounce column on ColleagueInvite",
    !/bounce/i.test(inviteModel),
    "a column would duplicate the receipt and could disagree with it"
  );
  ok(
    "9 — ⚠⚠⚠ `complained` IS NOT TREATED AS UNDELIVERED",
    /status: \{ in: \["bounced", "failed", "suppressed"\] \}/.test(PAGE) &&
      !/in: \[[^\]]*complained[^\]]*\][\s\S]{0,80}undelivered/.test(PAGE),
    "a complaint means the mail ARRIVED and the person pressed spam; saying " +
      "'Not delivered' would send the sender chasing a typo that does not exist"
  );
  ok(
    "9 — ⚠ the newest receipt wins, so a successful resend is not overruled",
    /orderBy: \{ created_at: "desc" \}/.test(PAGE)
  );
  ok('9 — the badge reads "Not delivered"', /label: "Not delivered"/.test(CLIENT));
  ok(
    "9 — ⚠ it is RED, not grey — grey is the colour of nothing-to-do",
    /UNDELIVERED = \{ label: "Not delivered", tone: "bg-red-/.test(CLIENT)
  );
  ok(
    "9 — ⚠ Joined overrides it",
    /row\.undelivered && !row\.joined \? UNDELIVERED/.test(CLIENT),
    "if they are on the platform the mail reached them, whatever a stale receipt says"
  );
  /* ⚠⚠ SCOTT: "DO NOT BUILD A RE-INVITE ACTION YET… letting them correct it in
     place is a journey change and I will rule on it separately." */
  ok(
    "9 — ⚠⚠ NO RE-INVITE ACTION WAS BUILT",
    !/(Resend|Re-invite|Try again)</i.test(CLIENT),
    "Scott rules on correcting an address in place separately"
  );
}

/* ═══ 10 · UNDELIVERABLE DOMAINS ARE REFUSED, AND RECORDED ══════════════
   ⚠⚠ The rail that replaces "the sandbox refuses everything". It lives in the
   TRANSPORT so it cannot be forgotten on a machine — MAIL_CAPTURE is a real rail
   and it is OFF for exactly that reason.                                     */
{
  const LIST = "src/lib/email/undeliverable-domains.ts";
  const L = strip(readFileSync(LIST, "utf8"));
  ok("10 — the domain list is its own module", L.length > 0);
  ok(
    "10 — ⚠ IT IS A LIST, NOT A REGEX — adding a domain is a one-line diff",
    /UNDELIVERABLE_DOMAINS: readonly string\[\] = \[/.test(L),
    "Scott: adding a domain should be something somebody can see in review"
  );
  for (const d of ["example.com", "example.seed", '".test"', '".invalid"', '".example"'])
    ok(`10 — refuses ${d.replace(/"/g, "")}`, L.includes(d.replace(/"/g, "")));

  ok("10 — ⚠ the transport consults it", /undeliverableRule\(/.test(TRANSPORT));
  ok(
    "10 — ⚠⚠ A REFUSAL IS RECORDED, NOT SILENTLY DROPPED",
    /status: "refused"/.test(TRANSPORT),
    "a skip that records nothing is the defect this whole brief existed to kill"
  );
  ok(
    "10 — ⚠ and it is refused BEFORE the send, not after",
    TRANSPORT.indexOf('status: "refused"') < TRANSPORT.indexOf("emails.send("),
  );
  ok(
    "10 — ⚠ no OTHER module filters recipients by domain",
    /* ⚠ The transport CALLS it and the list module DEFINES it; a third file
       would be a second copy of the rail. */
    FILES.filter((f) => f !== "src/lib/resend.ts" && f !== LIST)
      .filter((f) => /undeliverableRule\(/.test(strip(readFileSync(f, "utf8"))))
      .length === 0,
    "one rail, in the transport — a second copy is a second thing to forget"
  );
}

/* ═══ 11 · EVERY RECEIPT SAYS WHERE IT CAME FROM (slice of `E548`) ═══════ */
{
  const model = /model SentEmail \{[\s\S]*?\n\}/.exec(
    readFileSync("prisma/schema.prisma", "utf8")
  )?.[0] ?? "";
  ok("11 — the environment column exists", /\benvironment\s+String\s+@default\("unknown"\)/.test(model));
  ok("11 — ⚠ and it is indexed", /@@index\(\[environment\]\)/.test(model));
  ok("11 — the transport stamps it", /environment: sendingEnvironment\(\)/.test(TRANSPORT));
  ok(
    "11 — ⚠ it reads VERCEL_ENV, so preview and production are distinguishable",
    /process\.env\.VERCEL_ENV/.test(TRANSPORT)
  );
}

if (failures.length > 0) {
  console.error(`\ncheck:sent-email — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck:sent-email — ${pass}/${pass} passed\n`);
