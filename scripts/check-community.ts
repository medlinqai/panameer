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

if (failures.length > 0) {
  console.error(`check:community — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:community — ${pass}/${pass} passed`);
