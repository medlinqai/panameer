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

if (failures.length > 0) {
  console.error(`\ncheck:sent-email — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\ncheck:sent-email — ${pass}/${pass} passed\n`);
