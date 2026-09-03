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

if (failures.length > 0) {
  console.error(`check:community — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:community — ${pass}/${pass} passed`);
