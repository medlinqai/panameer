/**
 * `check:community` — the three ways this signal goes wrong
 * (brief_community_signal WS4).
 *
 *   1  NOTHING MAY BE LABELLED "MESSAGES". There is no messaging model in this
 *      codebase — no Conversation, no Message, no `/api/messages`. Scott asked
 *      for "community posts...messages"; posts ship and messages do not, and a
 *      post count under the word "messages" would be a made-up number for a
 *      feature that does not exist.
 *   2  `marked_helpful_at` IS WRITTEN ONLY BY `lib/forums.ts`, AND ONLY AFTER
 *      THE TWO CHECKS. Only the thread's author, never their own reply — the
 *      whole design rests on that, and a second write path would dissolve it.
 *   3  THE PROFILE BLOCK IS ABSENT, NOT ZEROED, for a person with no activity.
 *      A zero on a public profile is a claim about a person and it is the wrong
 *      one.
 *
 * ⚠ COMMENTS ARE STRIPPED BEFORE ANY SCAN. This file names every forbidden
 * token, and so do the components' own header comments; a scanner that read
 * prose would fail on its own documentation, and the fix for that is always to
 * weaken the scanner.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { MENTOR_HELPFUL_THRESHOLD, mentorState } from "@/lib/community-signal";

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

const SELF = join("scripts", "check-community.ts");
const files = [...walk("src"), ...walk("scripts")].filter((f) => f !== SELF);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

const SIGNAL_LIB = join("src", "lib", "community-signal.ts");
const FORUMS = join("src", "lib", "forums.ts");
const BLOCK = join("src", "components", "profile", "CommunitySignal.tsx");
const schema = readFileSync(join("prisma", "schema.prisma"), "utf8");

for (const f of [SIGNAL_LIB, FORUMS, BLOCK]) {
  check(`the file this guard is about exists: ${f}`, bodies.has(f));
}
const signalLib = bodies.get(SIGNAL_LIB) ?? "";
const forums = bodies.get(FORUMS) ?? "";
const block = bodies.get(BLOCK) ?? "";

// ---------------------------------------------------------------------------
// GUARD 1 — nothing calls a post count "messages"
// ---------------------------------------------------------------------------

/*
  THE ROOT FACT FIRST. If a messaging model ever lands, this assertion is what
  says "re-read the rule" rather than letting the ban quietly become wrong.
*/
const schemaNoComments = strip(schema).replace(/\/\/\/[^\n]*/g, " ");
check(
  "GUARD 1 — there is still NO messaging model in the schema",
  !/\bmodel\s+(Conversation|Message|DirectMessage|ChatMessage)\b/.test(schemaNoComments),
  "if one landed, the 'messages' ban below needs revisiting rather than deleting"
);

/*
  ⚠ THE SURFACES THAT CARRY FORUM COUNTS MAY NOT SAY "MESSAGE" AT ALL. Not
  "fewer times", not "only in a comment" — the counting lib and the block that
  renders it are held to a total ban, because the whole failure mode is one
  label drifting onto one number.
*/
for (const [name, body] of [
  ["the counting lib", signalLib],
  ["the profile block", block],
] as const) {
  const hits = body.match(/messag/gi) ?? [];
  check(
    `GUARD 1 — ${name} never uses the word "message"`,
    hits.length === 0,
    `${hits.length} occurrence(s)`
  );
}

/* And no OTHER file may put that word next to one of these counts. */
const countTokens = /\b(helpfulAnswers|replyCount|replies|threadsStarted|postCount)\b/;
const nearMisses = [...bodies.entries()]
  .filter(([, b]) => /messag/i.test(b) && countTokens.test(b))
  .filter(([, b]) =>
    /messag[a-z]*["'`\s:,)}]{0,4}[^\n]{0,40}\b(helpfulAnswers|replyCount|replies|threadsStarted|postCount)\b/i.test(
      b
    ) ||
    /\b(helpfulAnswers|replyCount|replies|threadsStarted|postCount)\b[^\n]{0,40}messag/i.test(b)
  )
  .map(([f]) => f);
check(
  "GUARD 1 — no file puts a forum count on the same line as the word message",
  nearMisses.length === 0,
  nearMisses.join(", ")
);

// ---------------------------------------------------------------------------
// GUARD 2 — one write path, behind two checks
// ---------------------------------------------------------------------------

/*
  ⚠ A WRITE, NOT A SELECT. `marked_helpful_at: true` inside a Prisma `select` is a
  READ, and the counting lib legitimately does one — the first version of this
  regex flagged it and would have been "fixed" by exempting the file, which is
  exactly how a guard stops guarding. A write assigns something that is not a
  select flag.
*/
/*
  ⚠ THE WHITESPACE IS INSIDE THE LOOKAHEAD, and that is not a style choice.
  `:\s*(?!true\b)` matches anyway, because `\s*` backtracks to zero and the
  lookahead then only has to see a SPACE rather than `true`. The first two
  versions of this line both passed `marked_helpful_at: true` off as a write.
*/
const WRITE = /marked_helpful_(at|by)\s*:(?!\s*(?:true|false)\b)/;
const writers = [...bodies.entries()].filter(([, b]) => WRITE.test(b)).map(([f]) => f);
check(
  "GUARD 2 — `marked_helpful_*` is written in exactly one file",
  writers.length === 1 && writers[0] === FORUMS,
  writers.join(", ") || "nowhere at all"
);

/* No component may even mention the column — the mapping is the lib's job. */
const componentLeaks = [...bodies.entries()]
  .filter(([f]) => f.startsWith(join("src", "components")))
  .filter(([, b]) => /marked_helpful/.test(b))
  .map(([f]) => f);
check(
  "GUARD 2 — no component touches the column",
  componentLeaks.length === 0,
  componentLeaks.join(", ")
);

/* The two rules exist, in one place, and both writers go through it. */
check(
  "GUARD 2 — the gate refuses a caller who is not the thread's author",
  /post\.thread\.author_id\s*!==\s*person\.id[\s\S]{0,200}throw new ForumError/.test(forums)
);
check(
  "GUARD 2 — the gate refuses marking your OWN reply",
  /post\.author_id\s*===\s*person\.id[\s\S]{0,160}throw new ForumError/.test(forums)
);
check(
  "GUARD 2 — markHelpful goes through the gate",
  /export async function markHelpful\([\s\S]{0,200}loadForMarking\(viewer, postId\)/.test(forums)
);
check(
  "GUARD 2 — unmarkHelpful goes through the same gate (undo is not a bypass)",
  /export async function unmarkHelpful\([\s\S]{0,200}loadForMarking\(viewer, postId\)/.test(forums)
);
check(
  "GUARD 2 — the acting person comes from the session, never a parameter",
  /async function loadForMarking\(viewer: Viewer, postId: string\)[\s\S]{0,120}ownPerson\(viewer\)/.test(
    forums
  ) && !/loadForMarking\([^)]*personId/.test(forums)
);
check(
  "GUARD 2 — it REFUSES rather than silently no-opping",
  (forums.match(/throw new ForumError/g) ?? []).length >= 5,
  `${(forums.match(/throw new ForumError/g) ?? []).length} refusal sites`
);
/*
  ⚠ AND THERE IS STILL NO VOTE. Upvotes, reactions, reputation points and a
  leaderboard were all explicitly out of scope; a schema column is how one of
  them would arrive.
*/
check(
  "GUARD 2 — no upvote / reaction / reputation column appeared",
  !/\b(upvote|downvote|vote_count|reaction|reputation|karma|points_total)\b/i.test(
    schemaNoComments
  )
);

// ---------------------------------------------------------------------------
// GUARD 3 — absent, not zeroed
// ---------------------------------------------------------------------------

check(
  "GUARD 3 — the lib returns null when there is no activity at all",
  /if \(threads\.length === 0 && posts\.length === 0\) return null;/.test(signalLib)
);
check(
  "GUARD 3 — the block renders nothing for a null signal",
  /if \(!signal\) return null;/.test(block)
);
check(
  "GUARD 3 — the profile passes the signal in rather than the block fetching it",
  /community\?\s*:\s*CommunitySignal \| null/.test(
    bodies.get(join("src", "components", "profile", "ProviderProfileView.tsx")) ?? ""
  )
);
/* Both profile surfaces actually supply it, or the block can never appear. */
for (const page of [
  join("src", "app", "(app)", "profile", "page.tsx"),
  join("src", "app", "(app)", "providers", "[id]", "page.tsx"),
]) {
  check(
    `GUARD 3 — ${page} supplies the signal`,
    /getCommunitySignalForProfile\(/.test(bodies.get(page) ?? "")
  );
}
/*
  ⚠ NO RANK, NO PERCENTILE, NO "TOP CONTRIBUTOR". Those need a population and the
  population is currently zero — a percentile of nobody is not a compliment.
*/
check(
  "GUARD 3 — the block claims no rank or percentile",
  !/percentile|top contributor|rank(ed|ing)?\b|#\d+ of/i.test(block)
);

// ---------------------------------------------------------------------------
// The Mentor badge
// ---------------------------------------------------------------------------

/*
  ⚠ THE THRESHOLD MUST STAY UNSET UNTIL SOMEBODY CHOOSES ONE. This is the
  assertion that stops a number being invented in passing: there is no
  distribution to choose against — measured 2026-08-19, nobody has ever posted.
*/
check(
  "MENTOR — the threshold is still unset, so the badge cannot be lit on a guess",
  MENTOR_HELPFUL_THRESHOLD === null,
  `it is ${String(MENTOR_HELPFUL_THRESHOLD)}`
);
check(
  "MENTOR — with no threshold, no number earns it",
  [0, 1, 3, 25, 10_000].every((n) => mentorState(n, true).earned === false)
);
check(
  "MENTOR — the owner sees the live count even at zero",
  mentorState(0, true).detail === "answers marked helpful: 0"
);
check(
  "MENTOR — a visitor sees no zero, only what it is for",
  mentorState(0, false).detail === "for answers marked helpful"
);
check(
  "MENTOR — a visitor DOES see a non-zero count",
  mentorState(4, false).detail === "answers marked helpful: 4"
);
check(
  "MENTOR — the count is carried through, not re-derived",
  mentorState(7, true).helpfulAnswers === 7
);

// ---------------------------------------------------------------------------
// GUARD 7 — THE RELATIONSHIP MODEL (`P1-ALL-E372` WS-6).
//
// Scott's terminology table encodes THREE shapes and the whole point of these six
// assertions is that they CANNOT COLLAPSE INTO ONE GENERIC CONNECTION:
//   · Colleague — MUTUAL, needs acceptance.
//   · Mentor    — ONE-WAY, needs none.
//   · Team      — a list one party keeps about others. ⚠ NOT a `ConnectionKind`;
//                 `lib/teams.ts` already implements it via
//                 `ProviderProfile.coordinator_person_id`. Folding it in here would
//                 give one row two meanings.
// ⚠ These read the SOURCE, not the database — this harness has no DB handle. They
// guard the shape of the code that writes the rows, which is where the invariant
// can actually be broken.
// ---------------------------------------------------------------------------

const CONNECTIONS = join("src", "lib", "connections.ts");
const SUGGESTIONS = join("src", "lib", "colleague-suggestions.ts");
const connections = bodies.get(CONNECTIONS) ?? "";
const suggestions = bodies.get(SUGGESTIONS) ?? "";

check("E372 — lib/connections.ts is on disk", connections.length > 0);
check("E372 — lib/colleague-suggestions.ts is on disk", suggestions.length > 0);

/* 1. ⚠ A `COLLEAGUE` NEVER REACHES `ACCEPTED` WITHOUT A `responded_at`. The
      acceptance IS the timestamp; an accepted row with a null one cannot say when
      it was accepted, and the mutual half of the model rests on that. Every write
      that sets `ACCEPTED` is required to set `responded_at` in the SAME object. */
const acceptedWrites = [...connections.matchAll(/status\s*:\s*"ACCEPTED"[\s\S]{0,200}?\}/g)].map(
  (m) => m[0]
);
check(
  "E372/1 — every ACCEPTED write exists (the pattern still matches the source)",
  acceptedWrites.length >= 3,
  `found ${acceptedWrites.length}`
);
const acceptedWithoutStamp = acceptedWrites.filter((w) => !/responded_at\s*:/.test(w));
check(
  "E372/1 — no ACCEPTED write lands without responded_at",
  acceptedWithoutStamp.length === 0,
  acceptedWithoutStamp.join(" || ")
);

/* 2. ⚠ A `MENTOR` ROW IS NEVER `PENDING`. Following is one-way and needs nobody's
      permission, so a pending mentor row is a state the product does not have. */
const mentorPending = /kind\s*:\s*"MENTOR"[\s\S]{0,160}?status\s*:\s*"PENDING"|status\s*:\s*"PENDING"[\s\S]{0,160}?kind\s*:\s*"MENTOR"/;
check(
  "E372/2 — no MENTOR row is ever written PENDING",
  !mentorPending.test(connections)
);
check(
  "E372/2 — the MENTOR create sets ACCEPTED explicitly",
  /kind\s*:\s*"MENTOR"[\s\S]{0,120}?status\s*:\s*"ACCEPTED"/.test(connections)
);

/* 3. ⚠ `DECLINED` IS A FIRST-CLASS STATE, NEVER A DELETED ROW. Deleting a decline
      re-offers the same person forever. Declining must UPDATE.
      ⚠ ONE delete is legitimate and is not a loophole: unfollowing a mentor. A
      follow is not a claim about the other person, so it leaves nothing behind.
      That delete is required to be scoped to `kind: "MENTOR"`. */
const deletes = [...connections.matchAll(/prisma\.connection\.delete(?:Many)?\(\{[\s\S]{0,260}?\}\)/g)].map(
  (m) => m[0]
);
check(
  "E372/3 — the only connection delete is the MENTOR unfollow",
  deletes.length === 1 && /kind\s*:\s*"MENTOR"/.test(deletes[0]),
  `${deletes.length} delete(s): ${deletes.join(" || ").slice(0, 200)}`
);
check(
  "E372/3 — declining UPDATES to DECLINED rather than deleting",
  /status\s*:\s*"DECLINED"/.test(connections) &&
    /prisma\.connection\.update\(\{[\s\S]{0,300}?status\s*:\s*"DECLINED"/.test(connections)
);
check(
  "E372/3 — DECLINED rows are still counted, so they are provably not gone",
  /"DECLINED"[\s\S]{0,80}?\.length|declinedCount/.test(connections)
);

/* 4. ⚠ NO SELF-CONNECTION, ASSERTED IN THE LIB AND NOT ONLY IN THE UI. A hidden
      button is not a rule; the API is reachable without it. */
check(
  "E372/4 — the lib refuses a self-connection",
  /\bfunction refuseSelf\b/.test(connections) && /code\s*[:=][\s\S]{0,120}"SELF"/.test(connections)
);
const entryPoints = ["requestColleague", "followMentor"];
const unguarded = entryPoints.filter((fn) => {
  const m = new RegExp("export async function " + fn + "\\([\\s\\S]{0,600}").exec(connections);
  return !m || !/refuseSelf\(/.test(m[0]);
});
check(
  "E372/4 — every relationship entry point calls refuseSelf",
  unguarded.length === 0,
  `unguarded: ${unguarded.join(", ")}`
);
check(
  "E372/4 — search never returns the searcher",
  /searchMembers[\s\S]{0,900}?\bid\s*:\s*\{\s*not\s*:/.test(connections)
);

/* 5. ⚠ EVERY SUGGESTION CARRIES ITS REASON IN THE UI. Scott's rule is that a
      suggestion has to say WHY, so `reason` is NOT OPTIONAL ON THE TYPE — a
      reasonless suggestion is a type error, not a lint warning. This is the guard
      against the generic "people you may know" the brief forbids. */
check(
  "E372/5 — reason is required on ColleagueSuggestion (no `?`)",
  /\breason\s*:\s*string;/.test(suggestions) && !/\breason\s*\?\s*:/.test(suggestions)
);
const addCalls = [...suggestions.matchAll(/\badd\(\s*[\s\S]{0,220}?\)/g)].map((m) => m[0]);
check(
  "E372/5 — the three overlap rules all fire (add() is called at least 3×)",
  addCalls.length >= 3,
  `${addCalls.length} call(s)`
);
check(
  "E372/5 — no suggestion rule invents a person with no overlap",
  /SuggestionRule\s*=\s*"employer"\s*\|\s*"project"\s*\|\s*"specialization"/.test(suggestions),
  "the rule union is the whole set of reasons a suggestion can exist"
);
check(
  "E372/5 — already-connected people are excluded in EVERY state, DECLINED included",
  /connectionsSent|connection\.findMany/.test(suggestions) &&
    !/status\s*:\s*\{\s*(?:not\s*:\s*)?"?DECLINED/.test(suggestions),
  "a DECLINED row must suppress the suggestion, so it cannot be filtered out"
);

/* 6. ⚠ `ConnectionKind` IS EXACTLY `COLLEAGUE` AND `MENTOR`, AND TEAM IS NOT IN IT. */
const kindEnum = /enum ConnectionKind \{([^}]*)\}/.exec(schemaNoComments);
const kinds = (kindEnum?.[1] ?? "").split(/\s+/).filter(Boolean);
check(
  "E372/6 — ConnectionKind is exactly COLLEAGUE + MENTOR",
  kinds.length === 2 && kinds.includes("COLLEAGUE") && kinds.includes("MENTOR"),
  `[${kinds.join(", ")}]`
);
check(
  "E372/6 — TEAM is NOT folded into ConnectionKind",
  !kinds.includes("TEAM"),
  "team is ProviderProfile.coordinator_person_id in lib/teams.ts — one row, one meaning"
);
check(
  "E372/6 — ConnectionStatus keeps all three states",
  ["PENDING", "ACCEPTED", "DECLINED"].every((v) =>
    new RegExp(`enum ConnectionStatus \\{[^}]*\\b${v}\\b`).test(schemaNoComments)
  )
);
check(
  "E372/6 — one row per pair per kind, enforced by the DB not the app",
  /@@unique\(\[from_user_id,\s*to_user_id,\s*kind\]\)/.test(schemaNoComments)
);
check(
  "E372/6 — lib/teams.ts still owns Team and was not rewritten onto Connection",
  (bodies.get(join("src", "lib", "teams.ts")) ?? "").length > 0 &&
    !/prisma\.connection/.test(bodies.get(join("src", "lib", "teams.ts")) ?? "")
);

// ---------------------------------------------------------------------------
// GUARD 8 — THE SCREEN OVER THE ENGINE (`P1-ALL-E374`).
//
// `E372` built the whole relationship engine and nothing rendered it. These
// assertions guard the three things the rendering could get wrong in ways a
// human walk would not reliably catch.
// ---------------------------------------------------------------------------

/* ── 1 · THE WORD `FOLLOW` IS DEAD IN EVERY RENDERED STRING ──────────────────
   SCOTT: *"maybe we remove the word follow and capacity defines the
   connection...i want to connect to you as a colleague...i want to connect to
   her as a mentor."*
   ⚠ THE INTERNAL IDENTIFIERS STAY — `followMentor`, `unfollowMentor` and the
   `"FOLLOWING"` relation literal. Renaming them churns this harness for no
   user-visible gain, and the brief says so explicitly. So the scan looks for
   the word as USER-FACING TEXT, not as an identifier.
   ⚠ EXEMPTED NARROWLY, PER LINE, NEVER BY WHOLE FILE — a file-level exemption
   would let a real rendered `Follow` in later under cover of an identifier. */
const FOLLOW_WORD = /\b(un)?follow(ing|ers?|s|ed)?\b/i;

/* ⚠⚠ THE SCAN LOOKS AT COPY, NOT AT CODE, and getting that boundary right is
   the whole assertion. A first version tested whole lines and flagged four
   things that are not copy at all: `robots: { follow: true }` (Next.js
   metadata), and the local identifiers `const following = …`,
   `following.length`, `following.map`. Exempting those by NAME would have been
   a growing blocklist that eventually lets real copy through.
   ⚠ SO IT EXTRACTS WHAT A USER CAN ACTUALLY READ — string literals and JSX text
   nodes — and tests only that. An identifier is never inside either. */
function userFacingText(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = [];
  /* Offset -> 1-based line, so a match anywhere reports a usable location. */
  const lineAt = (idx: number) => src.slice(0, idx).split("\n").length;

  /* Quoted strings, all three delimiters. */
  for (const m of src.matchAll(
    /"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g
  )) {
    const text = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (text) out.push({ line: lineAt(m.index ?? 0), text });
  }

  /* ⚠⚠ JSX TEXT NODES, ACROSS LINE BREAKS — and that `s`-less multiline match is
     the point. A first version scanned line by line and therefore MISSED the
     commonest formatting of all:
         <Link …>
           Follow
         </Link>
     because the `>` and the `<` are on different lines. It was caught by
     mutation-testing rather than by reading: injecting a bare `Follow` as JSX
     text passed a green harness. `[^<>{}]` already matches newlines, so running
     the scan over the WHOLE SOURCE instead of per line closes it. */
  for (const m of src.matchAll(/>([^<>{}]+)</g)) {
    const text = m[1].trim();
    if (text) out.push({ line: lineAt(m.index ?? 0), text });
  }
  return out;
}

/* ⚠ THE ONE EXEMPTION, AND IT IS A SINGLE EXACT LITERAL, NOT A FILE OR A
   PATTERN: the `"FOLLOWING"` relation value. It is a wire/DB value the brief
   explicitly keeps. */
const FOLLOWING_LITERAL = /^FOLLOWING$/;
/* ⚠⚠ NEXT.JS ROBOTS METADATA IS A MACHINE DIRECTIVE, NOT COPY — BUT THIS
   EXEMPTION HAD TO BE NARROWED, AND THE FIRST VERSION WAS A REAL DEFECT.
   It read `^(index|noindex|follow|nofollow)(,\s*…)*$`, which matches the bare
   string `"Follow"` — THE EXACT LABEL THIS GUARD EXISTS TO BAN. A rendered
   `Follow` sailed through a green harness; mutation-testing caught it, reading
   did not.
   ⚠ SO A DIRECTIVE NOW HAS TO LOOK LIKE ONE: two or more comma-separated
   tokens. `"index, follow"` is exempt; `"Follow"` can never be. Property-key
   forms like `robots: { follow: true }` need no exemption at all — they are not
   string literals and the scan never sees them. */
const ROBOTS_DIRECTIVE =
  /^(index|noindex|follow|nofollow)(\s*,\s*(index|noindex|follow|nofollow))+$/i;

/* ⚠⚠ THE TEST IS "IS THIS THE SOCIAL-GRAPH LABEL", NOT "DOES THIS CONTAIN THE
   ENGLISH WORD FOLLOW", and the difference is the whole assertion. The brief
   bans the word *"as a user-facing label"* — it does not ban ordinary English.
   A version that banned the word outright flagged five innocent sentences:
     · *"our reader may have missed a layout it couldn't follow"* (OwnerAiPass)
     · *"Reports follow this page's Volume-Over-Time metrics"* (TaskPanel)
     · *"This narrows everything that follows."* (CreateWorkRequest)
   ⚠ REWRITING THOSE WOULD BE INVENTING COPY to satisfy a harness — the exact
   inversion of what the assertion is for. So the rule is: a LABEL is a SHORT
   string that STARTS with the word and is not a sentence. `Follow`,
   `Following`, `Unfollow`, `Follow back` and `Followers` all fail; a sentence
   that merely uses the verb does not. */
const FOLLOW_LABEL = /^(un)?follow(ing|ers?|s)?\b/i;
function isFollowLabel(text: string): boolean {
  const t = text.trim();
  if (!FOLLOW_LABEL.test(t)) return false;
  /* A label is short and is not a sentence. Both conditions, so a sentence that
     happens to open with "Following the assessment, …" is not a false hit. */
  return t.length <= 24 && !/[.!?,;:]$/.test(t) && !/\s(the|a|an|this|that|these|your)\s/i.test(t);
}

const UI_DIRS = [join("src", "app"), join("src", "components")];
const uiFiles = [...bodies.entries()].filter(([f]) => UI_DIRS.some((d) => f.startsWith(d)));
const followLeaks: string[] = [];
for (const [file, body] of uiFiles) {
  for (const { line, text } of userFacingText(body)) {
    if (!FOLLOW_WORD.test(text)) continue;
    if (FOLLOWING_LITERAL.test(text)) continue;
    if (ROBOTS_DIRECTIVE.test(text)) continue;
    if (!isFollowLabel(text)) continue;
    followLeaks.push(`${file}:${line} ${text.slice(0, 80)}`);
  }
}
check(
  "E374/1 — no rendered string in src/app or src/components says Follow",
  followLeaks.length === 0,
  followLeaks.slice(0, 8).join(" || ")
);
check(
  "E374/1 — the scan is real (it looked at a meaningful number of files)",
  uiFiles.length > 100,
  `${uiFiles.length} files scanned`
);
/* ⚠ AND THE INTERNAL NAMES ARE STILL THERE. If a later change renames them, the
   scan above would pass VACUOUSLY — this is what stops that. */
check(
  "E374/1 — followMentor / unfollowMentor kept their names in the lib",
  /\bexport async function followMentor\b/.test(connections) &&
    /\bexport async function unfollowMentor\b/.test(connections)
);
check(
  "E374/1 — the FOLLOWING relation literal is unchanged",
  /"FOLLOWING"/.test(connections)
);
/* ⚠ THE REPLACEMENT VERB ACTUALLY SHIPS. Deleting the word without shipping
   `Connect as mentor` would also pass the scan. */
const controls = bodies.get(join("src", "components", "community", "ConnectControls.tsx")) ?? "";
check("E374/1 — ConnectControls is on disk", controls.length > 0);
check(
  "E374/1 — one verb, two capacities: both labels ship",
  /Connect as colleague/.test(controls) && /Connect as mentor/.test(controls)
);
check(
  "E374/1 — Decline is a real button, not a hidden menu item",
  />\s*Decline\s*</.test(controls)
);
/* ⚠ SINGLE-CLICK IS THE SPECIFICATION — no modal, no confirm, not even on
   Decline. A `confirm(` or a dialog in this component is a brief violation. */
check(
  "E374/1 — no confirmation step anywhere in the connect controls",
  !/\bwindow\.confirm\(|\bconfirm\(|role="dialog"|<Modal\b/.test(controls)
);

/* ── 2 · THE PLATFORM RATE ANCHOR HAS NO LIVE CALLER ────────────────────────
   A platform-fixed price goes stale, cannot answer demand, and tells a
   genuinely senior person their hour is worth what everyone else's is. */
const mentorsLib = bodies.get(join("src", "lib", "mentors.ts")) ?? "";
check("E374/2 — lib/mentors.ts is on disk", mentorsLib.length > 0);
check(
  "E374/2 — MICRO_SESSION_PRICE is commented out, not deleted",
  !/^\s*export const MICRO_SESSION_PRICE/m.test(mentorsLib) &&
    /MICRO_SESSION_PRICE/.test(readFileSync(join("src", "lib", "mentors.ts"), "utf8")),
  "the constant must survive on disk inside a comment"
);
check(
  "E374/2 — MICRO_SESSION_MINUTES is commented out, not deleted",
  !/^\s*export const MICRO_SESSION_MINUTES/m.test(mentorsLib) &&
    /MICRO_SESSION_MINUTES/.test(readFileSync(join("src", "lib", "mentors.ts"), "utf8"))
);
const anchorCallers = [...bodies.entries()]
  .filter(([f]) => f !== join("src", "lib", "mentors.ts"))
  .filter(([, b]) => /MICRO_SESSION_(PRICE|MINUTES)/.test(b))
  .map(([f]) => f);
check(
  "E374/2 — the platform anchor has no live caller anywhere",
  anchorCallers.length === 0,
  anchorCallers.join(", ")
);
/* ⚠ PHASE 4 IS CANCELLED and the header must not still promise it. */
check(
  "E374/2 — mentors.ts no longer promises a PHASE 4 MentorProfile storefront",
  !/PHASE 4 adds that model, the storefront and the booking/.test(
    mentorsLib.replace(/\*"[\s\S]*?"\*/g, " ")
  ) || /PHASE 4 IS CANCELLED/.test(readFileSync(join("src", "lib", "mentors.ts"), "utf8")),
  "the old plan may be QUOTED, but the cancellation has to be stated"
);
/* ⚠ NO MENTOR OPT-IN WAS BUILT. Scott: everyone CAN be; demand confers it. */
check(
  "E374/2 — no MentorProfile model was added to the schema",
  !/model\s+MentorProfile\b/.test(schemaNoComments)
);
check(
  "E374/2 — no mentor opt-in flag was added to ProviderProfile",
  !/\b(is_mentor|mentor_opt_in|accepts_mentoring|mentor_rate_cents)\b/.test(schemaNoComments)
);

/* ── 3 · A RENDERED RATE IS THE PROVIDER'S OWN, AND NEVER A ZERO ────────────
   The rule lives in `lib/rate-display.ts` so it can be asserted at all. */
const rateLib = bodies.get(join("src", "lib", "rate-display.ts")) ?? "";
check("E374/3 — lib/rate-display.ts is on disk", rateLib.length > 0);
check(
  "E374/3 — the rule reads the provider's own three fields",
  /rateMinCents/.test(rateLib) && /rateMaxCents/.test(rateLib) && /hourlyRateCents/.test(rateLib)
);
check(
  "E374/3 — the range wins only when BOTH bounds are present",
  /r\.rateMinCents != null && r\.rateMaxCents != null/.test(rateLib),
  "one half of a range is not a range"
);
check(
  "E374/3 — absence returns null so the caller can say so honestly",
  /return null;/.test(rateLib) && /NO_RATE_PUBLISHED/.test(rateLib)
);
/* ⚠ `!= null`, NOT TRUTHINESS. `||` would treat a real 0 as absent and fall
   through to the wrong branch — the exact bug this rule exists to prevent. */
check(
  "E374/3 — the rule tests for null, never truthiness",
  !/if \(r\.(rateMinCents|rateMaxCents|hourlyRateCents)\)\s/.test(rateLib)
);
/* ⚠ NOBODY PRINTS A ZERO OR A PLACEHOLDER PRICE ON A COMMUNITY SURFACE. */
const RATE_SURFACES = [
  join("src", "components", "community", "MemberRow.tsx"),
  join("src", "components", "community", "CommunityBlocks.tsx"),
  join("src", "app", "(app)", "community", "mentors", "page.tsx"),
];
for (const f of RATE_SURFACES) {
  const b = bodies.get(f) ?? "";
  check(`E374/3 — ${f} is on disk`, b.length > 0);
  check(
    `E374/3 — ${f} prints no hardcoded price`,
    !/\$\d/.test(b),
    "a literal dollar figure in a component is a platform anchor by another name"
  );
  check(
    `E374/3 — ${f} does not format money itself`,
    !/formatCents\(/.test(b),
    "money formatting belongs behind rateDisplay, so the null case cannot be skipped"
  );
}
/* ⚠ THE MENTOR-COUNT READ IS THE MECHANISM AND IT LIVES IN THE LIB. */
check(
  "E374/3 — the who-connected-to-me read is in lib/connections.ts",
  /mentorConnectionCount/.test(connections) &&
    /kind === "MENTOR" && r\.to_user_id === me/.test(connections)
);
const blocks = bodies.get(join("src", "components", "community", "CommunityBlocks.tsx")) ?? "";
check(
  "E374/3 — the mentor-count block is hidden at zero",
  /mine\.mentorConnectionCount > 0/.test(blocks),
  "0 members connected to you tells a new member they are unwanted"
);
check(
  "E374/3 — declinedCount is rendered nowhere",
  !/declinedCount/.test(blocks) && !/declinedCount/.test(bodies.get(join("src", "app", "(app)", "community", "page.tsx")) ?? "")
);
/* ⚠ NO INVITE STUB. A dead invite makes a member think they vouched for
   somebody who never heard. */
const connectionsRoute =
  bodies.get(join("src", "app", "api", "community", "connections", "route.ts")) ?? "";
check("E374/3 — the connections route is on disk", connectionsRoute.length > 0);
check(
  "E374/3 — no invite action was stubbed",
  !/\binvite\b/i.test(connectionsRoute) && !/\bInvite\b/.test(blocks)
);
/* ⚠ NO BUY BUTTON ANYWHERE ON THE MENTORING SURFACES. */
const mentorsPage = bodies.get(join("src", "app", "(app)", "community", "mentors", "page.tsx")) ?? "";
check(
  "E374/3 — no buy or booking control on the mentoring page",
  !/\b(Book|Buy|Checkout|Pay now|Purchase)\b/.test(mentorsPage),
  "paying runs on WorkRequest -> WorkOrder -> Settlement, which is unbuilt"
);
check(
  "E374/3 — nobody on the ask-for-mentoring page is labelled a mentor",
  !/>\s*Mentors?\s*</.test(mentorsPage),
  "nobody is a mentor until asked; the page offers people you can ASK"
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`check:community — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:community — ${pass}/${pass} passed`);
