import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * check:messages — the permission rule, asserted in the LIB (`P1-ALL-E379`).
 *
 * ⚠⚠ THE LOAD-BEARING ASSERTION IS THE FIRST ONE: a message requires an
 * ACCEPTED COLLEAGUE connection, and a MENTOR connection grants NOTHING.
 * `E372` writes MENTOR rows ACCEPTED instantly and unilaterally, so a mentor
 * permission would let anyone message anyone by connecting as a mentor first.
 *
 * ⚠ THESE READ THE SOURCE, NOT THE DATABASE. The rules live in
 * `lib/messages.ts`; this guards the shape of the code that enforces them,
 * which is where the rule can actually be broken. The three mutation cases the
 * brief names — a PENDING pair, a DECLINED pair, a MENTOR-only pair — are each
 * a distinct branch in `canMessage`, and each is asserted separately below.
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

const SELF = join("scripts", "check-messages.ts");
const files = [...walk("src"), ...walk("scripts")].filter((f) => f !== SELF);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

const LIB = join("src", "lib", "messages.ts");
const lib = bodies.get(LIB) ?? "";
const libRaw = readFileSync(LIB, "utf8");
const schema = strip(readFileSync(join("prisma", "schema.prisma"), "utf8")).replace(
  /\/\/\/[^\n]*/g,
  " "
);

check("lib/messages.ts is on disk", lib.length > 0);

/* ── 1 · ⚠⚠ THE PERMISSION. ACCEPTED COLLEAGUE ONLY. ──────────────────────── */
check(
  "1 — canMessage reads the COLLEAGUE kind",
  /kind:\s*"COLLEAGUE"/.test(lib),
  "the permission is derived from the connection, not from message history"
);
/* ⚠⚠ THE MENTOR HOLE. `canMessage` must never look at a MENTOR row. */
check(
  "1 — a MENTOR connection grants NO message permission",
  !/kind:\s*"MENTOR"/.test(lib) && !/"MENTOR"/.test(lib),
  "E372 writes MENTOR rows ACCEPTED unilaterally; a mentor permission is a spam hole"
);
/* MUTATION CASE A — a PENDING pair must be refused, by its own branch. */
check(
  "1a — a PENDING colleague pair is refused",
  /status === "PENDING"\)\s*return deny\("PENDING"\)/.test(lib)
);
/* MUTATION CASE B — a DECLINED pair must be refused, by its own branch. */
check(
  "1b — a DECLINED colleague pair is refused",
  /status === "DECLINED"\)\s*return deny\("DECLINED"\)/.test(lib)
);
/* MUTATION CASE C — no connection row at all is refused. A MENTOR-only pair
   reaches THIS branch, because the query filters to COLLEAGUE. */
check(
  "1c — no COLLEAGUE row means refused (this is the MENTOR-only path)",
  /if \(!rel\) return deny\("NOT_CONNECTED"\)/.test(lib)
);
/* ⚠ AND THE PERMISSION IS NOT INFERRED FROM MESSAGE HISTORY. */
check(
  "1 — permission is never derived from an existing message",
  !/prisma\.message\.(findFirst|findMany|count)[\s\S]{0,300}?return \{ ok: true \}/.test(lib)
);
/* ⚠ EITHER DIRECTION — a colleague row belongs to both parties. */
check(
  "1 — the colleague row is matched in either direction",
  /from_user_id: viewer\.userId, to_user_id: otherUserId/.test(lib) &&
    /from_user_id: otherUserId, to_user_id: viewer\.userId/.test(lib)
);

/* ── 2 · NO SELF-MESSAGING ────────────────────────────────────────────────── */
check(
  "2 — canMessage refuses yourself, first",
  /if \(viewer\.userId === otherUserId\) return deny\("SELF"\)/.test(lib)
);

/* ── 3 · `read_at` IS THE RECIPIENT'S ─────────────────────────────────────── */
/* ⚠⚠ SCOPED TO `markRead`'s OWN BODY, AND THE FIRST VERSION WAS A REAL HOLE.
   It matched `to_user_id: viewer.userId` within 400 characters of the word
   `markRead` — a window that ran straight past the end of the function and into
   `unreadCount` below it, which contains that exact clause. So deleting the
   scope from `markRead` left the harness GREEN while a sender could mark their
   own outgoing messages read. Caught by mutation, not by reading.
   ⚠ THE FIX IS TO CUT THE FUNCTION OUT FIRST and assert on that alone. */
function bodyOf(src: string, name: string): string {
  const start = src.indexOf(`export async function ${name}`);
  if (start === -1) return "";
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return "";
}
const markReadBody = bodyOf(lib, "markRead");
check("3 — markRead was found by the scan", markReadBody.length > 0);
check(
  "3 — markRead scopes to rows addressed TO the viewer",
  /to_user_id: viewer\.userId/.test(markReadBody),
  "a sender must never be able to mark their own message read"
);
/* ⚠ AND IT IS SCOPED TO THE OTHER PARTY TOO, so opening one conversation does
   not silently clear every unread in the account. */
check(
  "3 — markRead only clears the conversation being opened",
  /from_user_id: otherUserId/.test(markReadBody)
);
const readWrites = [...lib.matchAll(/read_at:\s*new Date\(\)/g)].length;
check(
  "3 — read_at is written in exactly one place",
  readWrites === 1,
  `${readWrites} write(s)`
);
check(
  "3 — unreadCount counts only rows addressed to the viewer",
  /unreadCount[\s\S]{0,300}?to_user_id: viewer\.userId,\s*read_at: null/.test(lib)
);

/* ── 4 · THE OPT-OUT OVERRIDES AN ACCEPTED COLLEAGUE ──────────────────────── */
check(
  "4 — available_for_messages === false blocks the send",
  /available === false\) return deny\("UNAVAILABLE"\)/.test(lib)
);
check(
  "4 — the opt-out is checked AFTER the connection, so it can override it",
  lib.indexOf('deny("NOT_CONNECTED")') < lib.indexOf('deny("UNAVAILABLE")')
);
/* ⚠ ABSENT PROFILE = REACHABLE. `=== false`, never truthiness — a member with
   no ProviderProfile has never opted out, and `!available` would mute them. */
check(
  "4 — absence of a profile is not treated as an opt-out",
  !/if \(!available\)/.test(lib)
);

/* ── 5 · NOTHING DELETES A MESSAGE ────────────────────────────────────────── */
const deleters = [...bodies.entries()]
  .filter(([, b]) => /prisma\.message\.delete(Many)?\(/.test(b))
  .map(([f]) => f);
check("5 — no code path deletes a Message", deleters.length === 0, deleters.join(", "));

/* ── 6 · IN-APP ONLY WHILE `E371` IS OPEN ─────────────────────────────────── */
check(
  "6 — the send fires message.received",
  /event: "message\.received"/.test(lib)
);
check(
  "6 — no email channel is declared at the send",
  !/\bresend\b/i.test(lib) && !/sendEmail|EMAIL_FROM|RESEND_API_KEY/.test(lib),
  "email cannot send while E371 is open; declaring a channel is the E034 shape"
);
/* ⚠ `message.unread > N` IS A DIGEST EVENT AND DIGESTS DO NOT EXIST. It must
   stay unwired — nothing may call notify() with it. */
const unreadFirers = [...bodies.entries()]
  .filter(([f]) => f !== join("src", "lib", "notification-events.ts"))
  .filter(([, b]) => /event:\s*"message\.unread"/.test(b))
  .map(([f]) => f);
check(
  "6 — message.unread > N is still unwired",
  unreadFirers.length === 0,
  `${unreadFirers.join(", ")} — it is a digest event and there is no digest sender`
);
/* ⚠ AND NO SCHEDULER WAS BUILT. */
check(
  "6 — no scheduler or cron was added for digests",
  !/node-cron|setInterval\([\s\S]{0,80}message/i.test(lib)
);

/* ── 7 · ZERO RENDERS NOTHING ─────────────────────────────────────────────── */
const tabs = bodies.get(join("src", "components", "casing", "PageTabs.tsx")) ?? "";
check(
  "7 — the tab badge is guarded against zero",
  /t\.badge !== undefined && t\.badge > 0/.test(tabs),
  "a 0 badge reports an absence as a measurement"
);
check(
  "7 — the helper omits the badge entirely at zero",
  /if \(unread <= 0\) return tabs;/.test(lib)
);
const list = bodies.get(join("src", "app", "(app)", "messages", "page.tsx")) ?? "";
check("7 — the messages page is on disk", list.length > 0);
check(
  "7 — the conversation list hides its unread pip at zero",
  /c\.unread > 0 &&/.test(list)
);

/* ── 8 · THE MODEL IS ONE TABLE ───────────────────────────────────────────── */
check("8 — Message model exists", /model Message \{/.test(schema));
check(
  "8 — no Thread or Participant model was added",
  !/model Thread\b/.test(schema) && !/model Participant\b/.test(schema),
  "a conversation is DERIVED from the pair; groups are a different feature"
);
for (const col of ["from_user_id", "to_user_id", "body", "created_at", "read_at"]) {
  check(`8 — Message.${col} exists`, new RegExp(`\\b${col}\\b`).test(/model Message \{[\s\S]*?\n\}/.exec(schema)?.[0] ?? ""));
}

/* ── 9 · THE SERVER RE-CHECKS, AND NO RULE LIVES IN A COMPONENT ───────────── */
check(
  "9 — sendMessage re-checks the permission server-side",
  /sendMessage[\s\S]{0,600}?const permission = await canMessage\(/.test(lib),
  "a UI that hides the box is not a permission"
);
const uiRuleLeaks = [...bodies.entries()]
  .filter(([f]) => f.startsWith(join("src", "app")) || f.startsWith(join("src", "components")))
  .filter(([, b]) => /prisma\.message\./.test(b))
  .map(([f]) => f);
check(
  "9 — no component or page queries the Message table directly",
  uiRuleLeaks.length === 0,
  uiRuleLeaks.join(", ")
);
/* ⚠ THE REASON, NOT A BOOLEAN — the composer explains BEFORE the send. */
for (const r of ["SELF", "NOT_CONNECTED", "PENDING", "DECLINED", "UNAVAILABLE", "NOT_A_MEMBER"]) {
  check(`9 — DENIAL_COPY covers ${r}`, new RegExp(`${r}:`).test(lib));
}
check(
  "9 — canMessage returns a reason, not a bare boolean",
  /Promise<MessagePermission>/.test(lib) && /reason: MessageDenial/.test(lib)
);

/* ── 10 · ⚠ THE PAID-ENGAGEMENT SEAM IS NAMED, NOT STUBBED ────────────────── */
check(
  "10 — the paid-engagement exception is documented on canMessage",
  /pay prior to connection/.test(libRaw) &&
    /A PAID ENGAGEMENT GRANTS A MESSAGE PERMISSION AND THIS IS WHERE IT PLUGS/.test(libRaw),
  "Scott's exception is correct but unbuildable; name the seam, do not stub it"
);
check(
  "10 — and it is NOT implemented as a branch that can never fire",
  !/workOrder|WorkOrder|settlement|Settlement/.test(lib),
  "a gate whose condition is permanently false is the E034 shape"
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:messages — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:messages — ${pass}/${pass} passed`);
