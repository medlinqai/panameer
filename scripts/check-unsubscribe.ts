import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { verifyUnsubscribeToken, unsubscribeToken, maskEmail } from "@/lib/unsubscribe";

/**
 * check:unsubscribe — the five invariants (`P1-ALL-E386`).
 *
 * ⚠⚠ THIS IS LIVE. `E371` turned the key on, so a broken unsubscribe is no
 * longer a dead link in a drawer — it is a dead unsubscribe in DELIVERED mail,
 * which is how a sending domain gets blocked. `mail.panameer.com` has no
 * reputation yet to spend.
 */
let pass = 0;
const failures: string[] = [];
const check = (name: string, ok: boolean, detail = "") => {
  if (ok) pass += 1;
  else failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
};

const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}
const SELF = join("scripts", "check-unsubscribe.ts");
const files = [...walk("src"), ...walk("scripts")].filter((f) => f !== SELF);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

const transport = bodies.get(join("src", "lib", "resend.ts")) ?? "";
const lib = bodies.get(join("src", "lib", "unsubscribe.ts")) ?? "";
const shell = bodies.get(join("src", "lib", "email", "shell.ts")) ?? "";
const publicRoutes = bodies.get(join("src", "lib", "public-routes.ts")) ?? "";
const routeAccess = bodies.get(join("src", "lib", "route-access.ts")) ?? "";
const proxy = bodies.get(join("src", "proxy.ts")) ?? "";
const schema = strip(readFileSync(join("prisma", "schema.prisma"), "utf8")).replace(/\/\/\/[^\n]*/g, " ");

/* ── 1 · ⚠⚠ THE TRANSPORT CONSULTS SUPPRESSION ────────────────────────────── */
check("1 — lib/unsubscribe.ts is on disk", lib.length > 0);
check(
  "1 — sendEmail consults the suppression list",
  /isSuppressed\(/.test(transport),
  "in the TRANSPORT, so a new sender cannot forget"
);
/* ⚠ AND IT RUNS BEFORE BOTH EARLY RETURNS — a suppressed address must not even
   be written to a capture file, and getResend() throws without a key. */
/* ⚠ COMPARED AGAINST THE CALL SITES, NOT THE DEFINITIONS — and that was a real
   bug in this assertion: `mailCaptureEnabled` and `getResend` are both DEFINED
   above `sendEmail`, so `indexOf` on the bare name found the definition and the
   ordering read backwards. */
check(
  "1 — the check precedes the capture branch and the Resend client",
  transport.indexOf("await isSuppressed(") < transport.indexOf("if (mailCaptureEnabled())") &&
    transport.indexOf("await isSuppressed(") < transport.indexOf("await getResend()"),
  "a suppressed address must not even be written to a capture file"
);
/* ⚠⚠ SILENT SKIP RETURNING SUCCESS, NEVER A THROW. A caller's flow must not
   break because somebody opted out. */
check(
  "1 — a fully-suppressed send returns success rather than throwing",
  /allowed\.length === 0[\s\S]{0,200}?return \{ id: "suppressed" \}/.test(transport),
  "a provider validating a project must not see an error because the contact opted out"
);
check(
  "1 — no caller does its own suppression check",
  ![...bodies.entries()]
    .filter(
      ([f]) =>
        /* ⚠ THE TRANSPORT OWNS IT; the unsubscribe surfaces legitimately READ it
           to show "already done"; and `lib/unsubscribe.ts` DEFINES it. Anything
           else calling it is a sender doing the transport's job. */
        f !== join("src", "lib", "resend.ts") &&
        f !== join("src", "lib", "unsubscribe.ts") &&
        f !== join("src", "app", "api", "unsubscribe", "route.ts") &&
        f !== join("src", "app", "unsubscribe", "page.tsx")
    )
    .some(([, b]) => /isSuppressed\(/.test(b)),
  "seven senders are seven places to forget; there is one transport"
);

/* ── 2 · ⚠⚠ NOTHING EVER DELETES A SUPPRESSION ROW ───────────────────────── */
const deleters = [...bodies.entries()]
  .filter(([, b]) => /emailSuppression\.delete(Many)?\(/.test(b))
  .map(([f]) => f);
check(
  "2 — nothing deletes a suppression row",
  deleters.length === 0,
  `${deleters.join(", ")} — re-importing a CSV must not resurrect somebody who opted out`
);
check("2 — and there is no unsuppress() to call", !/export .*function unsuppress/.test(lib));
check("2 — the EmailSuppression model exists", /model EmailSuppression \{/.test(schema));
/* ⚠ KEYED ON EMAIL, NOT person_id — that is the whole reason it is a new table:
   NotificationPreference cannot record a suppression for an address with no
   Person row, which is exactly the imported-list recipient. */
const model = /model EmailSuppression \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? "";
check("2 — it is keyed on email", /\bemail\s+String/.test(model));
check("2 — it is NOT keyed on a person", !/person_id/.test(model));
check("2 — a null category means everything", /category\s+String\?/.test(model));

/* ── 3 · ⚠⚠ A FORGED TOKEN IS REJECTED — TESTED, NOT INSPECTED ───────────── */
process.env.NEXTAUTH_SECRET ||= "check-unsubscribe-test-secret";
const good = unsubscribeToken("a@b.com", "message.received");
check("3 — a valid token verifies", verifyUnsubscribeToken("a@b.com", "message.received", good));
check("3 — a forged token is rejected", !verifyUnsubscribeToken("a@b.com", "message.received", "forged"));
/* ⚠ THE SIGNATURE BINDS BOTH FIELDS. A token for one address must not work for
   another, and a token for one category must not be replayed onto another. */
check("3 — a token does not transfer to another address", !verifyUnsubscribeToken("c@d.com", "message.received", good));
check("3 — a token does not transfer to another category", !verifyUnsubscribeToken("a@b.com", "learn.progress", good));
check("3 — an empty token is rejected", !verifyUnsubscribeToken("a@b.com", "message.received", ""));
/* ⚠ CONSTANT-TIME COMPARISON — a `===` leaks the signature prefix through
   timing, which is how these get forged one byte at a time. */
check("3 — the comparison is constant-time", /timingSafeEqual\(/.test(lib));
/* ⚠ AND IT IS SIGNED, NOT A RAW ID: a Person uuid in a URL would be an
   unsubscribe API for the whole platform. */
check("3 — the token is an HMAC, not an identifier", /createHmac\(/.test(lib));
/* ⚠ NO EXPIRY — an unsubscribe must work in a year-old email. */
check("3 — the token carries no expiry", !/expires|ttl|TTL|maxAge/i.test(lib));
/* ⚠ THE ADDRESS IS MASKED — this URL gets forwarded. */
check("3 — the page masks the address", maskEmail("scott@straterp.com").startsWith("s•"));
check("3 — and never prints it whole", !maskEmail("scott@straterp.com").includes("scott"));

/* ── 4 · ⚠⚠ THE ROUTE IS PUBLIC. A CAPABILITY GATE ON IT MUST FAIL. ──────── */
check(
  "4 — /unsubscribe is on the public allowlist",
  /route: "\/unsubscribe"/.test(publicRoutes),
  "the default is DENY, so the entry is what makes it reachable"
);
check(
  "4 — no ROUTE_ACCESS rule gates /unsubscribe",
  !/"\/unsubscribe"/.test(routeAccess),
  "an obligation a recipient cannot discharge without logging in is not honoured"
);
check(
  "4 — the proxy matcher does not gate /unsubscribe",
  !/"\/unsubscribe/.test(proxy),
  "an unsubscribe must work for an address with NO ACCOUNT, which no capability can satisfy"
);
const page = bodies.get(join("src", "app", "unsubscribe", "page.tsx")) ?? "";
check("4 — the page is on disk", page.length > 0);
check(
  "4 — the page runs no guard",
  !/guardPage\(/.test(page),
  "no login, and no session is read"
);
const api = bodies.get(join("src", "app", "api", "unsubscribe", "route.ts")) ?? "";
check("4 — the API route is on disk", api.length > 0);
check("4 — the API runs no capability guard", !/guardApi\(/.test(api));
/* ⚠ BUT THE TOKEN IS RE-VERIFIED SERVER-SIDE. Public is not unauthenticated
   nonsense — the signature IS the authorisation. */
check(
  "4 — the API re-verifies the token",
  /verifyUnsubscribeToken\(/.test(api),
  "a page that renders a button is not an authorisation"
);

/* ── 5 · ⚠⚠ NO FOOTER LINKS TO /settings/notifications ANY MORE ──────────── */
check(
  "5 — the email shell no longer links to /settings/notifications",
  !/settings\/notifications/.test(shell),
  "route-access.ts gates /settings behind canProvideServices, so a buyer was bounced"
);
check(
  "5 — the footer carries the placeholder instead",
  /UNSUBSCRIBE_PLACEHOLDER/.test(shell)
);
check(
  "5 — the transport resolves the placeholder per recipient",
  /UNSUBSCRIBE_PLACEHOLDER/.test(transport) && /unsubscribeUrl\(/.test(transport),
  "templates are recipient-agnostic; only sendEmail knows `to`"
);
/* ⚠ AND THE SUPERSEDED CLAIM IS QUOTED, NOT DELETED. */
check(
  "5 — shell.ts quotes the argument it superseded",
  /a truer 'unsubscribe' than a link/.test(readFileSync(join("src", "lib", "email", "shell.ts"), "utf8")),
  "half right — true for a signed-in provider, false for everyone else"
);

if (failures.length > 0) {
  console.error(`check:unsubscribe — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:unsubscribe — ${pass}/${pass} passed`);
