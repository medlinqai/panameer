/**
 * `check:mail-containment` — outside production, mail goes nowhere unless named
 * (`P2-ALL-E607`). `npm run check:mail-containment`.
 *
 * ── ⚠⚠⚠ WHAT THIS GATE CAN AND CANNOT PROVE ──────────────────────────────
 *
 * ⚠ **A STATIC CHECK CANNOT SEE AN ENVIRONMENT IT DOES NOT RUN IN.** That is
 * the lesson that produced `email_sending_state.md`: `check:email` asserted the
 * SOURCE's fallback (`onboarding@resend.dev`) and was read for two months as a
 * claim about REACH, while production had been sending real mail since 07-23.
 *
 * ⚠⚠ SO THIS GATE DOES NOT ASSERT "PREVIEW IS CONTAINED". It cannot — it runs
 * on a developer machine. ⚠⚠⚠ **THE PROOF IS THE MAIL HEALTH CARD, READ IN THE
 * ENVIRONMENT BEING ASKED ABOUT.** What this asserts is narrower and honest:
 * that the PREDICATE behaves correctly when given each environment, and that
 * the refusal is wired the way the other refusal already is.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const f = join(dir, e);
    if (statSync(f).isDirectory()) { if (!/node_modules|\.next/.test(f)) walk(f, out); }
    else if (/\.tsx?$/.test(f)) out.push(f);
  }
  return out;
}

(async () => {
  const files = walk("src");
  check("0 — ⚠ the sweep found source to read (E586)", files.length > 50, `${files.length} files`);

  /*
    ── ⚠⚠⚠ THE PREDICATE, EXERCISED — NOT READ ────────────────────────────
    ⚠ `VERCEL_ENV` is flipped in-process and `sendingState()` is CALLED. This is
    the one thing a source-reading assertion could never do, and the reason the
    old `check:email` tripwire could not see 2026-09-11.
  */
  const before = process.env.VERCEL_ENV;
  const { sendingState } = await import("@/lib/email/sending-state");
  const at = (env: string | undefined) => {
    if (env === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = env;
    return sendingState();
  };

  check(
    "1 — ⚠⚠⚠ production is NOT contained — a real tester is on it today",
    at("production").containedToAllowlist === false,
    "production sending is untouched"
  );
  for (const env of ["preview", "development", undefined] as const) {
    const s = at(env);
    check(
      `1 — ⚠⚠ "${env ?? "(unset — a developer machine)"}" IS contained`,
      s.containedToAllowlist === true,
      `environment="${s.environment}"`
    );
  }
  if (before === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = before;

  /*
    ⚠⚠ THE ALLOW-LIST IS EMPTY BY DEFAULT AND THAT IS THE RESTING STATE.
    ⚠ A non-empty list is not a failure — it is how somebody tests a flow on a
    preview — but it must be a DELIBERATE, visible act, so the gate PRINTS it.
  */
  const { NON_PRODUCTION_ALLOWLIST } = await import("@/lib/email/non-production-allowlist");
  check(
    "2 — ⚠ the non-production allow-list is empty by default",
    NON_PRODUCTION_ALLOWLIST.length === 0,
    NON_PRODUCTION_ALLOWLIST.length
      ? `⚠⚠ ${NON_PRODUCTION_ALLOWLIST.length} ADDRESS(ES) NAMED: ${NON_PRODUCTION_ALLOWLIST.join(", ")} — deliberate?`
      : "0 addresses — no non-production environment can reach anyone"
  );

  /*
    ── ⚠⚠ NOTHING BUT THE TRANSPORT TALKS TO RESEND ────────────────────────
    ⚠ `E386`'s whole design: suppression, receipts and both refusals live in ONE
    place so a new sender cannot forget them. A second caller of the SDK would
    bypass every one of them at once.
  */
  const TRANSPORT = join("src", "lib", "resend.ts");
  /*
    ⚠⚠ A SENDER IS SOMETHING THAT CALLS `.emails.send(`, NOT SOMETHING THAT
    CONSTRUCTS THE SDK. ⚠ The first version forbade `new Resend(` too and
    flagged `api/webhooks/resend/route.ts`, which constructs the client ONLY to
    call `resend.webhooks.verify()` — signature checking, the opposite of
    sending. ⚠⚠⚠ **A GATE THAT CANNOT TELL SENDING FROM VERIFYING WOULD HAVE
    BEEN "FIXED" BY EXEMPTING THAT FILE BY NAME**, and the next real sender
    added there would have inherited the exemption.
  */
  const senders = files.filter((f) => {
    if (f === TRANSPORT) return false;
    return /\.emails\.send\(/.test(strip(readFileSync(f, "utf8")));
  });
  check(
    "3 — ⚠⚠⚠ only the transport calls emails.send",
    senders.length === 0,
    senders.length ? senders.join(", ") : "one send path"
  );
  /* ⚠ And every other holder of the SDK is verification-only, derived rather
     than named: it constructs a client and never sends with it. */
  const holders = files.filter(
    (f) => f !== TRANSPORT && /new Resend\(/.test(strip(readFileSync(f, "utf8")))
  );
  check(
    "3 — ⚠⚠ every other Resend client is verification-only",
    holders.every((f) => !/\.emails\./.test(strip(readFileSync(f, "utf8")))),
    holders.length ? `${holders.join(", ")} — construct but never send` : "no other client"
  );

  /*
    ── ⚠⚠ A REFUSAL IS RECORDED, NEVER DROPPED ────────────────────────────
    ⚠ Scott, 2026-09-17: *"A skip that records nothing is the defect this whole
    brief existed to kill."*
  */
  const transport = strip(readFileSync(TRANSPORT, "utf8"));
  /*
    ⚠⚠⚠ THE ASSERTION IS ON THE ENVIRONMENT BRANCH ITSELF, NOT ON THE FILE.
    ⚠ The first version asked whether `refused.push(r)` appeared ANYWHERE and
    whether `record(refused…)` existed — both true because the DOMAIN refusal
    does them. ⚠⚠ SO DELETING THE ENVIRONMENT REFUSAL'S PUSH PASSED THE GATE:
    the mutation landed, the recipient became deliverable, and nothing failed.
    ⚠⚠⚠ **AN ASSERTION THAT ITS OWN MUTATION CANNOT FAIL IS NOT AN ASSERTION.**
    It now reads the slice of the branch between the allow-list test and its
    closing `continue`.
  */
  const envBranch = (() => {
    const i = transport.indexOf("allowedOutsideProduction(r)");
    if (i === -1) return "";
    const j = transport.indexOf("continue;", i);
    return j === -1 ? transport.slice(i) : transport.slice(i, j);
  })();
  check(
    "4 — ⚠⚠⚠ the environment refusal itself records a row, like the domain refusal",
    /refused\.push\(r\)/.test(envBranch),
    envBranch ? 'the branch pushes to `refused`' : "the branch was not found at all"
  );
  check(
    "4 — ⚠⚠ …and refused rows are written with no resend_message_id",
    /record\(\s*refused\.map\(\(email\) => \(\{ email, status: "refused" \}\)\)\s*\)/.test(
      transport.replace(/\s+/g, " ")
    ),
    'status: "refused"'
  );
  check(
    "4 — ⚠⚠ …and it is loud",
    /REFUSED \(environment/.test(transport),
    "console.warn names the environment and the address"
  );
  check(
    "5 — ⚠⚠⚠ the refusal is decided BEFORE Resend is touched",
    transport.indexOf("allowedOutsideProduction") < transport.indexOf("getResend()"),
    "the check precedes the client"
  );
  /* ⚠ THE CARD AND THE TRANSPORT MUST AGREE. If they diverge the card lies, and
     a line that lies is worse than no line. */
  const cardSrc = strip(readFileSync(join("src", "lib", "email", "sending-state.ts"), "utf8"));
  check(
    "5 — ⚠⚠ the health card computes containment from the same environment",
    /environment !== "production"/.test(cardSrc) && /sendingEnvironment\(\)/.test(cardSrc),
    "one predicate, both surfaces"
  );

  if (failures.length) {
    console.error(`\ncheck:mail-containment — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:mail-containment — ${pass}/${pass} passed`);
  process.exit(0);
})();
