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
import { publishedProfileCode } from "./_profile-surface";
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
/* `P2-J3-E567` WS-C — the Teams page and the component holding its two sets. */
const TEAMS_PAGE = join("src", "app", "(app)", "community", "teams", "page.tsx");
const TEAM_SECTIONS = join("src", "components", "community", "TeamSections.tsx");
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
  ⚠⚠ THE ROOT FACT CHANGED ON 2026-09-04, AND THIS ASSERTION IS WHY WE KNOW.

  ⚠ SUPERSEDED, QUOTED NOT DELETED. It used to read *"GUARD 1 — there is still
  NO messaging model in the schema"*, with the detail *"if one landed, the
  'messages' ban below needs revisiting rather than deleting"*. `P1-ALL-E379`
  landed one, so the assertion FIRED — exactly as designed — and its own
  instruction says REVISIT THE BAN, NOT DELETE IT.

  ⚠⚠ SO IT IS INVERTED RATHER THAN DROPPED. The rule it protects has NOT
  changed: a forum post count must never be called a "message". What changed is
  that the word now has a real referent elsewhere in the product, which makes
  the mislabel MORE confusing, not less — a "3 messages" badge on a profile
  that means forum replies now collides with a real unread count.

  ⚠ THE BAN BELOW IS THEREFORE UNCHANGED AND STILL TOTAL on the counting lib and
  the block that renders it. Nothing was relaxed to let `E379` through.
*/
const schemaNoComments = strip(schema).replace(/\/\/\/[^\n]*/g, " ");
check(
  "GUARD 1 — the Message model exists, so the 'messages' ban below matters MORE",
  /\bmodel\s+Message\b/.test(schemaNoComments),
  "P1-ALL-E379 built it; a forum count called 'messages' now collides with a real one"
);
/* ⚠ AND STILL NO CONVERSATION/THREAD MODEL — `E379` is deliberately one table,
   with the conversation DERIVED from the pair. If one of these ever lands, the
   1:1 assumption in `lib/messages.ts` needs re-reading. */
check(
  "GUARD 1 — messaging is still ONE table, with no Conversation or Thread model",
  !/\bmodel\s+(Conversation|Thread|DirectMessage|ChatMessage|Participant)\b/.test(
    schemaNoComments
  ),
  "a conversation is derived from the pair; a thread row would be a different feature"
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

/* ══ GUARD 3 · THE INSTRUCTOR CORRECTNESS SIGNAL (`P2-J3-E558` WS-B) ═══════
   ⚠⚠ A SEPARATE GUARD FROM GUARD 2, ON SCOTT'S RULING, SO A FAILURE NAMES WHICH
   SIGNAL BROKE. ⚠ `marked_helpful_*` answers *did this answer my question*
   (the asker); `instructor_confirmed_*` answers *is this answer correct* (the
   path's instructor). Folding them into one guard would report a break in one
   as a break in "the forum signals", which is the sentence nobody can act on.
   ⚠ THE REGEX IS DELIBERATELY DISTINCT — `instructor_confirmed_` shares no
   prefix with `marked_helpful_`, so neither guard can match the other's column.
*/
const CONFIRM_WRITE = /instructor_confirmed_(at|by)\s*:(?!\s*(?:true|false)\b)/;
const confirmWriters = [...bodies.entries()]
  .filter(([, b]) => CONFIRM_WRITE.test(b))
  .map(([f]) => f);
check(
  "GUARD 3 — `instructor_confirmed_*` is written in exactly one file",
  confirmWriters.length === 1 && confirmWriters[0] === FORUMS,
  confirmWriters.join(", ") || "nowhere at all"
);

const confirmLeaks = [...bodies.entries()]
  .filter(([f]) => f.startsWith(join("src", "components")))
  .filter(([, b]) => /instructor_confirmed/.test(b))
  .map(([f]) => f);
check(
  "GUARD 3 — no component touches the column",
  confirmLeaks.length === 0,
  confirmLeaks.join(", ")
);

/* ⚠ AUTHORITY IS DERIVED FROM THE BOARD'S PATH, never asserted by the caller.
   ⚠⚠ AND IT IS `teachesPathWhere`, THE ONE DEFINITION — NOT `expert_person_id`.
   Measured 2026-09-18: only 10 of 23 paths have a path-level expert, and the
   narrow field would have locked Scott out of all 16 paths he teaches across 338
   lessons. `check:forums` bans that field in `forums.ts` outright.
   ⚠ SUPERSEDED, quoted not deleted (`E164`) — this assertion first matched the
   narrow shape, because the first version of the code used it:

       check(
         "GUARD 3 — the gate refuses a caller who is not the path's instructor",
         /expertId\s*!==\s*person\.id[\s\S]{0,200}throw new ForumError/.test(forums)
       );

   ⚠ THE RULE IS UNCHANGED — refuse a caller who does not teach the path. Only
   the expression it matches changed, because the predicate was corrected. */
check(
  "GUARD 3 — authority is `teachesPathWhere`, the one definition",
  /teachesPathWhere\(person\.id\)[\s\S]{0,400}if \(!teaches\)/.test(forums),
  "expert_person_id alone silences a lesson-level expert in their own path"
);
check(
  "GUARD 3 — the gate refuses a caller who does not teach the path",
  /if \(!teaches\)[\s\S]{0,200}throw new ForumError/.test(forums)
);
/* ⚠⚠ THE FARMABLE SHAPE — an instructor answering in a path they teach. */
check(
  "GUARD 3 — the gate refuses confirming your OWN reply",
  /loadForConfirming[\s\S]{0,2000}post\.author_id\s*===\s*person\.id[\s\S]{0,160}throw new ForumError/.test(forums)
);
/* ⚠ A GENERAL BOARD HAS NO PATH, so nothing there is confirmable — there is
   nobody whose subject-matter authority the board represents.
   ⚠ SUPERSEDED (`E164`): `/!post\.thread\.board\.learning_path_id[\s\S]{0,200}throw new ForumError/` */
check(
  "GUARD 3 — a board with no path cannot be confirmed in",
  /if \(!pathId\)[\s\S]{0,200}throw new ForumError/.test(forums)
);

/* ══ ⚠⚠ THE SIGNALS DO NOT CROSS ══════════════════════════════════════════
   ⚠ Scott, 2026-09-18: *"instructor_confirmed_* does NOT feed Your Mentor
   Signal. community-signal.ts keeps counting marked_helpful_at and only that."*
   ⚠⚠ REUSING THE COLUMN WOULD HAVE MADE THE MENTOR SIGNAL'S LABEL FALSE IN THE
   FLATTERING DIRECTION — an instructor could inflate somebody's standing with a
   judgement the asker never made. */
const signalBody = bodies.get(SIGNAL_LIB) ?? "";
check(
  "E558 — the mentor signal never reads the instructor column",
  !/instructor_confirmed/.test(signalBody),
  "community-signal.ts counts marked_helpful_at and only that"
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
  /* ⚠⚠⚠ THE NAMED FILE IS RETIRED (`P2-A2-E597` WS-D). This read
     `ProviderProfileView.tsx`, which **nothing has imported since `E588`** —
     measured 2026-09-21, zero live imports in `src/`. The assertion was true
     about a file no route serves, which is coverage on paper only.
     ⚠ The published profile is derived from the route that renders it now.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   bodies.get(join("src", "components", "profile", "ProviderProfileView.tsx")) ?? ""
  */
  /community\?\s*:\s*CommunitySignal \| null/.test(publishedProfileCode())
);
/*
  Both profile surfaces actually supply it, or the block can never appear.

  ── ⚠⚠ THE OWNER'S PROFILE SURFACE MOVED (`P2-J3-E588` WS-A, 2026-09-19) ─────

  ⚠⚠⚠ THIS IS `check:rollup`'S CASE, NOT `check:cert-skills`' CASE — THE RULING
  CHANGED, THE CODE DID NOT DRIFT. Scott, 2026-09-19: *"connect is now 'build
  your profile and connect to other profiles'."* `/community` IS the owner's
  profile now and `(app)/profile/page.tsx` is a REDIRECT to it, so it supplies
  nothing and never can.

  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  // join("src", "app", "(app)", "profile", "page.tsx"),

  ⚠⚠ THE RULE IS UNCHANGED AND IS DELIBERATELY NOT WEAKENED: every surface that
  renders a profile still has to supply the signal. Only the list of which pages
  those ARE has moved. ⚠ `/community` was ADDED in the same edit that removed
  `/profile` — if it had only been removed, the owner would have silently lost
  the block and this guard would have gone green on the loss it exists to catch.
*/
/*
  ── ⚠⚠ `/community` → `/connect` (`P2-J3-E591` WS-A) ────────────────────────

  ⚠ THE RULE IS STILL NOT WEAKENED. `E591` split one route into two: the PROFILE
  is `/connect`, the PEOPLE are `/community`. ⚠⚠ `/community` NO LONGER RENDERS
  A PROFILE AT ALL, so asserting it supplies the signal would assert a call that
  should not be there — and leaving it would have failed the gate for the one
  reason that is not a defect.
  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   join("src", "app", "(app)", "community", "page.tsx"),
  ⚠⚠ THE SWAP IS DONE IN ONE EDIT, exactly as the paragraph above requires of
  the `/profile` → `/community` move: `/connect` is ADDED in the same change
  that removes `/community`, so the owner cannot silently lose the block.
*/
for (const page of [
  join("src", "app", "(app)", "connect", "page.tsx"),
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
/*
  ⚠⚠ A `where` CLAUSE IS A READ FILTER, NEVER A WRITE (`P2-J3-E588` WS-B).

  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  // const acceptedWrites = [...connections.matchAll(/status\s*:\s*"ACCEPTED"[\s\S]{0,200}?\}/g)].map((m) => m[0]);

  ⚠⚠ THE OLD PATTERN COULD NOT TELL A READ FROM A WRITE, and `E588`'s
  `mutualColleagueCount` reads `status: "ACCEPTED"` in a `where` to count
  colleagues. The guard reported that read as *"an ACCEPTED write without
  responded_at"* — a write it is not, and a column a `findMany` has no business
  setting.

  ⚠⚠⚠ THIS IS A TIGHTENING, NOT A WEAKENING: all three genuine writes sit in
  `data:` blocks and are still matched, and the count assertion below still
  requires at least three. ⚠ A NEW WRITE CANNOT HIDE IN A `where` — Prisma has
  no way to set a column from one.
*/
const acceptedWrites = [...connections.matchAll(/status\s*:\s*"ACCEPTED"[\s\S]{0,200}?\}/g)]
  .filter((m) => {
    const before = connections.slice(Math.max(0, (m.index ?? 0) - 200), m.index ?? 0);
    return before.lastIndexOf("where:") <= before.lastIndexOf("data:");
  })
  .map((m) => m[0]);
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
   `Connect as Mentor` would also pass the scan.
   ⚠⚠ THE CASE CHANGED, THE RULE DID NOT (`P1-A3-E531` PART D). Scott,
   2026-09-16: *"yes, make the capitals a rule"* — BUTTON LABELS ARE TITLE CASE,
   now standing rule 11 in `CLAUDE.md`. ⚠ SUPERSEDED, quoted not deleted
   (`E164`): this asserted `/Connect as colleague/` and `/Connect as mentor/`.
   ⚠ THE GUARD IS TAUGHT THE NEW TRUTH RATHER THAN THE COPY BEING REVERTED TO
   SATISFY IT — the same call `CLAUDE.md` records for `check:company-binding`.
   ⚠⚠ THE CAPITAL IS ASSERTED, so lower-casing these labels again fails here. */
const controls = bodies.get(join("src", "components", "community", "ConnectControls.tsx")) ?? "";
check("E374/1 — ConnectControls is on disk", controls.length > 0);
check(
  "E374/1 — one verb, two capacities: both labels ship",
  /Connect as Colleague/.test(controls) && /Connect as Mentor/.test(controls)
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
// GUARD 9 — TABS THAT CARRY THE SEQUENCE (`P1-ALL-E378`).
//
// ⚠⚠ THE LOAD-BEARING ONE IS THE FIRST: A `suggested` SET NEVER RENDERS A DONE
// STATE. You never finish "check your messages" — you do it again tomorrow — so
// a tick beside it asserts something false about the person looking at it.
// ---------------------------------------------------------------------------

const TABS = join("src", "components", "casing", "PageTabs.tsx");
const pageTabs = bodies.get(TABS) ?? "";
const navLib = bodies.get(join("src", "lib", "nav.ts")) ?? "";

check("E378 — PageTabs.tsx is on disk", pageTabs.length > 0);
check("E378 — lib/nav.ts is on disk", navLib.length > 0);

/* ── 1 · ⚠⚠ `suggested` HAS NO DONE STATE, ENFORCED BY CONSTRUCTION ────────
   The `done` flag must be gated on the mode being `process` IN THE SAME
   EXPRESSION that computes it. Checking the mode somewhere else and trusting
   the author to remember is exactly what this guard exists to prevent. */
const doneExpr = /const done\s*=\s*sequence === "process"\s*&&/;
check(
  "E378/1 — a done state is only computed when the mode is process",
  doneExpr.test(pageTabs),
  "the mode must gate the expression itself, not be checked elsewhere"
);
/* ⚠ AND `done` IS READ NOWHERE ELSE. If a second site reads `t.done` without
   the mode gate, the first assertion passes while the bug ships. */
const doneReads = [...pageTabs.matchAll(/\bt\.done\b/g)].length;
check(
  "E378/1 — t.done is read exactly once, inside the gated expression",
  doneReads === 1,
  `${doneReads} read(s)`
);
/* ⚠ THE TICK ITSELF IS REACHABLE ONLY THROUGH `done`. */
const tickLines = pageTabs.split("\n").filter((l) => l.includes("✓"));
check(
  "E378/1 — the tick glyph is rendered only from the done flag",
  tickLines.length === 1 && /done \?/.test(tickLines[0]),
  tickLines.join(" || ")
);
/* ── ⚠⚠ THE MODE `/community` DECLARES (`P2-J3-E557` WS-A) ─────────────────
   ⚠ CONNECT IS A ROOM A MEMBER RE-ENTERS, NOT A PATH THEY WALK ONCE, so the row
   carries no numbers. ⚠⚠ THIS ASSERTION IS INVERTED, NOT DELETED — the rule was
   never "this set is suggested", it was "this set declares the mode somebody
   actually decided", and the decision changed.

   ── ⚠ FOOTNOTE: THE SUPERSEDED ASSERTIONS (`E164`) ────────────────────────
   ⚠ Live until `E557`, quoted not deleted:

       check(
         "E378/1 — /community is declared suggested in nav.ts",
         /"\/community":\s*"suggested"/.test(navLib)
       );

   ⚠⚠ AND A SECOND ONE SAYING THE SAME THING, folded in here on Scott's ruling
   rather than inverted twice — *"this becomes a duplicate of #1 once inverted"*:

       // ⚠ THE MODE IS STILL `suggested`. You never finish checking your
       // messages, so step 1 must never acquire a done state.
       check(
         "E378/5 — /community is still suggested, not process",
         /"\/community":\s*"suggested"/.test(navLib)
       );

   ⚠ TWO ASSERTIONS OF ONE FACT IS NOT TWICE THE PROTECTION — it is two places
   to update and one of them gets missed. */
/* ⚠ RE-KEYED `/community` → `/connect` (`P2-J3-E591` WS-A). ⚠⚠ THE RULING IS
   UNTOUCHED — Connect is still a room and still declares `none`; only the key
   moved, because the band's Connect entry now lands on `/connect`.
   ⚠ SUPERSEDED, quoted not deleted (`E164`):
   //   "E557/1 - /community declares `none` …",
   //   /"\/community":\s*"none"/.test(navLib) */
check(
  "E557/1 — /connect declares `none`, so the row carries no step numbers",
  /"\/connect":\s*"none"/.test(navLib)
);
/* ── ⚠⚠ EVERY TAB SET IS DELIBERATELY CLASSIFIED (`P1-ALL-E384` WS-3) ──────
   Scott: *"we could define each menu sequential or parallel, then number the
   sequential only."* `TAB_SEQUENCE` already does that — but NOTHING STOPPED A
   FIFTH SET APPEARING WITH NO ENTRY and silently defaulting to `none`. A set
   that is unnumbered because nobody decided looks exactly like one that is
   unnumbered because somebody did, and only one of those is a decision.
   ⚠ `E384`'s brief said only ONE set was classified. That was wrong — `E378`
   classified all four. The missing piece was the guard, not the classification. */
const pageTabKeys = [...navLib.matchAll(/^\s*"(\/[^"]*)":\s*\[/gm)].map((m) => m[1]);
const seqBlock = /export const TAB_SEQUENCE[\s\S]*?\n\};/.exec(navLib)?.[0] ?? "";
check(
  "E384/3 — the PAGE_TABS keys were found by the scan",
  pageTabKeys.length >= 4,
  `${pageTabKeys.length} key(s)`
);
check("E384/3 — the TAB_SEQUENCE block was found by the scan", seqBlock.length > 0);
const unclassified = pageTabKeys.filter((k) => !seqBlock.includes(`"${k}":`));
check(
  "E384/3 — every PAGE_TABS set has an explicit TAB_SEQUENCE mode",
  unclassified.length === 0,
  `unclassified: ${unclassified.join(", ")} — unlisted defaults to none, hiding a decision nobody made`
);
/*
  ⚠⚠ `/settings` IS CLASSIFIED THOUGH IT IS NOT A `PAGE_TABS` KEY (`P2-J1.1-E046`).

  Its tab set is `SETTINGS_NAV` in `lib/settings-nav.ts` — the one definition
  `SettingsTabs` and `SettingsHeading` both read, so a tab and a page heading
  cannot disagree about what a page is called. Copying it into `PAGE_TABS` would
  create the second definition that rule forbids.

  ⚠ BUT THE SCAN ABOVE ONLY SEES `"/key": [` LITERALS, so a set defined
  elsewhere is invisible to it — it would fall through `tabSequenceFor`'s
  `?? "none"` and be unnumbered because nobody decided, which is the precise
  ambiguity `E384` built this guard to stop. This asserts the decision exists.
*/
check(
  "E046 — the /settings tab set is explicitly classified in TAB_SEQUENCE",
  seqBlock.includes('"/settings":'),
  "its tabs live in SETTINGS_NAV, so only its MODE is declared in nav.ts"
);

/* ⚠ AND `process` STAYS IN THE UNION EVEN WITH NO CONSUMER. Scott said keep it. */
check(
  "E384/3 — the process mode is kept even though nothing uses it",
  /"process" \| "suggested" \| "none"/.test(navLib),
  "Scott said keep it"
);

check(
  "E378/1 — tabSequenceFor defaults an undeclared set to none",
  /TAB_SEQUENCE\[baseRoute\] \?\? "none"/.test(navLib),
  "a set acquires a sequence only when somebody decides it has one"
);

/* ── 2 · THE AFFORDANCE IS NOT COLOUR ALONE ───────────────────────────────── */
check(
  "E378/2 — the active tab carries a 2.5px underline",
  /border-b-\[2\.5px\]/.test(pageTabs)
);
check(
  "E378/2 — inactive tabs hold the same width so nothing shifts",
  /border-transparent/.test(pageTabs)
);
check(
  "E378/2 — the active tab is announced to assistive tech, not just coloured",
  /aria-current=\{active \? "page" : undefined\}/.test(pageTabs)
);
/* ⚠ NOT PILLS — reusing the LEARN catalog's filter shape to navigate would
   teach one shape two meanings. A rounded-full on the LINK would be that. */
/* ⚠ SCOPED TO THE TAB LINK'S OWN CLASSES, AND THE FIRST VERSION WAS WRONG.
   It scanned the whole file for `rounded-full` and flagged two things that are
   round ON PURPOSE: the step-number DISC (a circle is what a numbered step is)
   and the `Early` BADGE (a pill is what a status pill is). Neither is the tab.
   ⚠ THE RULE IS ABOUT THE NAVIGATION CONTROL ITSELF — a pill-shaped TAB is what
   would collide with the LEARN catalog's filter pills. */
const linkTag = /<Link\b[\s\S]*?\n\s*>/.exec(pageTabs)?.[0] ?? "";
check("E378/2 — the tab link tag was found by the scan", linkTag.length > 0);
check(
  "E378/2 — the tab itself is not a pill",
  !/rounded-full|rounded-\[/.test(linkTag),
  "on the LEARN catalog a pill FILTERS; reusing that shape to navigate teaches one shape two meanings"
);

/* ── 3 · MOBILE SCROLLS. NO DROPDOWN. ─────────────────────────────────────── */
check("E378/3 — the strip scrolls sideways", /overflow-x-auto/.test(pageTabs));
check(
  "E378/3 — no dropdown hides the set",
  !/<select\b/.test(pageTabs) && !/role="menu"/.test(pageTabs) && !/<Menu\b/.test(pageTabs),
  "being able to SEE the set is the entire job of the row"
);
check("E378/3 — the right edge fades", /bg-gradient-to-l/.test(pageTabs));
check(
  "E378/3 — the fade cannot swallow a tap",
  /pointer-events-none[\s\S]{0,200}bg-gradient-to-l|bg-gradient-to-l[\s\S]{0,200}pointer-events-none/.test(
    pageTabs
  )
);
check("E378/3 — hit targets clear 44px", /min-h-\[44px\]/.test(pageTabs));
/* ⚠⚠ UPCOMING STEPS STAY CLICKABLE. GREYING IS A STATE, NOT A LOCK — a locked
   tab would contradict a product where a certificate has no lesson
   precondition. Nothing in this component may render a disabled tab. */
check(
  "E378/3 — no tab is ever disabled or unclickable",
  !/disabled/.test(pageTabs) && !/pointer-events-none[^"]*"\s*\)?\s*\}?\s*>\s*\{t\.label/.test(pageTabs)
);

/* ── 4 · THE RAIL IS ONE-WORD VERBS AND THE JOURNEY NAME SURVIVED ─────────── */
for (const [verb, journey] of [
  ["Learn", "Learning Paths"],
  ["Hire", "Work Requests"],
  ["Work", "Work Requests"],
  ["Shop", "Service Products"],
  ["Sell", "Service Products"],
  /* ⚠⚠ `P1-ALL-E533` — `Orders` IS NO LONGER A RAIL LABEL ON EITHER SIDE. Scott,
     2026-09-16: *"These are all verbs. Should read Manage Orders and Get Paid."*
     and then the buyer half: `Track Orders` / `Pay`. ⚠ SUPERSEDED, quoted not
     deleted (`E164`): `["Orders", "Work Orders"]`.
     ⚠⚠ THE JOURNEY NAME IS WHAT THIS LOOP GUARDS AND IT IS UNCHANGED — both
     sides still carry `heading: "Work Orders"`. Scott ruled the rail/heading
     split is not a conflict: the rail is a VERB (what you are about to do), the
     heading is a NOUN (what you are looking at). */
  /* ⚠⚠ `P2-ALL-E559` WS-A — THE SELLER SLOT IS `Orders` AGAIN. Scott,
     2026-09-17, for the BAND. ⚠ SUPERSEDED, quoted not deleted (`E164`):
     `["Manage Orders", "Work Orders"]`.
     ⚠⚠ THIS NARROWS `E533` PART B, IT DOES NOT REPEAL IT — rule 13, Scott's
     newest dated word wins. The band puts a LABEL UNDER AN ICON, where a
     two-word verb phrase is the widest thing in the row. ⚠ Every other slot
     still carries the verb rule, and the BUYER side below is untouched. */
  ["Orders", "Work Orders"],
  ["Track Orders", "Work Orders"],
  /*
    ── ⚠⚠ `Connect`'s JOURNEY NAME IS `My Profile` NOW (`P2-J3-E591` WS-A) ───

    ⚠⚠⚠ THIS IS `check:rollup`'S CASE, NOT `check:cert-skills`' — THE RULING
    CHANGED, THE CODE DID NOT DRIFT. The gate encoded a pairing that was correct
    while `/community` was Connect's landing; `E591` moved that landing to the
    member's own PROFILE, and Scott named the defect himself: the profile page
    was headed *"My Community"* because one route rendered two pages.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   ["Connect", "My Community"],
    ⚠⚠ THE RULE ITSELF IS UNWEAKENED AND STILL BITES: the rail still says the
    journey in ONE WORD and the full name still lives on `heading`. Only this
    slot's name changed, and it changed because the route behind it did.
    ⚠ `My Community` survives as the `<h1>` of `/community`, where it is now
    true — see `(app)/community/page.tsx`.
  */
  ["Connect", "My Profile"],
] as const) {
  check(
    `E378/4 — rail slot "${verb}" keeps its journey name "${journey}"`,
    new RegExp(`label: "${verb}",[\\s\\S]{0,40}heading: "${journey}"`).test(navLib),
    "the rail says the journey in one word; the name moves to the heading"
  );
}
/*
  ⚠⚠ THE MONEY SLOTS ARE VERB PHRASES NOW, AND THEY DIFFER BY SIDE (`P1-ALL-E533`).
  ⚠ SUPERSEDED, quoted not deleted (`E164`): this asserted `label: "Orders"` and
  `label: "Payments"` — Scott's earlier plural nouns, which themselves superseded
  his `Order`/`Settle` draft.
  ⚠⚠ IT WAS ALSO PASSING FOR THE WRONG REASON. `E533` Part B changed the SELLER
  rail to `Manage Orders`/`Get Paid` and this check stayed green, because the
  BUYER rail still carried the bare `Orders`/`Payments` it was matching. It only
  failed once both sides moved — so a half-done rename would not have been caught.
  It now asserts BOTH sides by name.
  ⚠ `Get Paid` is the seller's and `Pay` is the buyer's: a buyer PAYS.
*/
/* ⚠⚠ `P2-ALL-E559` WS-A. ⚠ SUPERSEDED, quoted not deleted (`E164`):
   // "E378/4 - the seller money slots are Manage Orders | Get Paid",
   // /label: "Manage Orders"/.test(navLib) && /label: "Get Paid"/.test(navLib)
   ⚠ `Manage Orders` became `Orders` for the band. ⚠⚠ `Get Paid` IS RETAINED and
   is still asserted — the brief said to remove it, and it was NOT removed
   because `/payments` is not reachable from Orders (no `PAGE_TABS` entry, no
   link). Reported at the WS-A gate; this assertion is what fails if it is
   dropped before that door exists. */
check(
  "E378/4 — the seller money slots are Orders | Get Paid",
  /label: "Orders"/.test(navLib) && /label: "Get Paid"/.test(navLib)
);
check(
  "E378/4 — the buyer money slots are Track Orders | Pay",
  /label: "Track Orders"/.test(navLib) && /label: "Pay"/.test(navLib)
);
/*
  ⚠⚠ SCOPED TO THE TWO RAIL ARRAYS, NOT THE WHOLE FILE. The first draft of this
  check scanned `navLib` entire and failed on `PAGE_TABS`, which legitimately has
  a TAB called `Payments` pointing at `/payments`. ⚠ A tab label and a rail label
  are different things; only the rail carries the verb rule.
*/
const railsOnly = (() => {
  const grab = (name: string) => {
    const i = navLib.indexOf(`export const ${name}`);
    if (i < 0) return "";
    const j = navLib.indexOf("\n];", i);
    return j < 0 ? "" : navLib.slice(i, j);
  };
  return grab("PROVIDER_NAV") + grab("REQUESTER_NAV");
})();
check(
  "E378/4 — no RAIL label reverts to a bare noun or to the Order | Settle draft",
  railsOnly.length > 0 &&
    !/label: "Settle"/.test(railsOnly) && !/label: "Order"[,\s]/.test(railsOnly) &&
    /* ⚠⚠ `label: "Orders"` IS NO LONGER FORBIDDEN (`P2-ALL-E559`) — it is the
       seller's slot again, by Scott's 2026-09-17 ruling for the band. ⚠
       SUPERSEDED, quoted not deleted (`E164`):
       // !/label: "Orders"/.test(railsOnly) &&
       ⚠ THE OTHER THREE STAY: `Settle`, a bare `Order`, and `Payments` are all
       still the drafts Scott overturned, and nothing since has revived them. */
    !/label: "Payments"/.test(railsOnly)
);
check(
  "E378/4 — pageTitleFor returns the journey name over the rail verb",
  /best\.heading \?\? best\.label/.test(navLib)
);

/* ── 5 · THE SLICE NAMES, AND NO ROUTE MOVED ──────────────────────────────── */
/*
  ── ⚠⚠ FIVE TABS, RENAMED AND FOLDED (`P2-J3-E593` WS-A) ──────────────────

  ⚠ SUPERSEDED, quoted not deleted (`E164`):
  //   for (const label of ["Colleagues", "Forums", "Mentoring", "Teams"]) {
  //     check(`E378/5 - /community tab "${label}" ships`, …);
  //   }

  ⚠⚠ THIS IS `check:rollup`'S CASE — THE RULING CHANGED, THE CODE DID NOT DRIFT.
  Scott, 2026-09-20: *"less tabs…simple. simple is easier to use."* `Colleagues`,
  `Mentoring` and `Teams` are SECTIONS of Community now; `Forums` is labelled
  `Groups`. ⚠ THE RULE ITSELF IS UNWEAKENED: the set is still asserted by exact
  label, and the count is asserted too, so a tab cannot quietly appear or vanish.
  ⚠⚠⚠ AND THE THREE FOLDED ROUTES DID NOT LOSE THEIR GUARD — it MOVED to the
  pair below, which checks the file that now guarantees them.
*/
const CONNECT_TABS = ["Profile", "Community", "Groups", "Service Products", "Settings"];
for (const label of CONNECT_TABS) {
  check(`E593/5 — Connect tab "${label}" ships`, new RegExp(`label: "${label}"`).test(navLib));
}
/* ⚠ FIVE, NOT "at least five" — Scott asked for fewer tabs, so the COUNT is the
   thing being held, and an appended sixth must fail rather than pass quietly. */
const connectSet = /"\/connect": \[[\s\S]*?\n  \],/.exec(navLib)?.[0] ?? "";
check(
  "E593/5 — the Connect row is exactly five tabs",
  (connectSet.match(/^\s*\{ label:/gm) ?? []).length === 5,
  `${(connectSet.match(/^\s*\{ label:/gm) ?? []).length} live entries`
);
/* ⚠⚠ THE REVENUE TABS ARE ADJACENT — Scott's own grouping: who you are · who
   you know (free) · GROUPS (money) · SERVICE PRODUCTS (money) · settings. */
check(
  "E593/5 — ⚠ the two revenue tabs sit next to each other",
  connectSet.indexOf('label: "Service Products"') - connectSet.indexOf('label: "Groups"') > 0 &&
    !connectSet.slice(
      connectSet.indexOf('label: "Groups"'),
      connectSet.indexOf('label: "Service Products"')
    ).includes('label: "Settings"')
);
check(
  "E378/5 — no tab repeats the journey name or says My",
  !/\{ n: \d+, label: "My /.test(navLib) && !/label: "My Community", href: "\/community" \}/.test(navLib)
);
/* ⚠⚠ MESSAGES IS UNNUMBERED, AND THAT IS A BUILD FACT: there is no Message
   model, and a suggested sequence whose step 1 is a dead end teaches people the
   numbers are decorative. */
/* ⚠⚠ THAT DAY CAME. `E378` shipped this as *"Messages carries no step number"*
   with the detail *"it takes 1 the day it has a model"* — quoted, not deleted.
   `P1-ALL-E379` built the model, so the assertion is INVERTED rather than
   dropped: the rule was never "Messages must be unnumbered", it was "a suggested
   sequence must not open on a dead end". Messages is now step 1, which is
   Scott's own order: *"1. Check Your Messages. 2. Search for Colleagues."* */
/* ── ⚠⚠ NO STEP NUMBERS IN THE SET AT ALL (`P2-J3-E557` WS-A) ──────────────
   ⚠⚠ THIS IS DELIBERATELY *NOT* AN INVERSION OF THE OLD ASSERTION. Scott,
   2026-09-18: *"Messages leaves /community entirely under `E560`, so asserting
   its position is asserting something with weeks to live."*
   ⚠ So the rule asserted is the one that OUTLIVES the move: the set carries no
   `n:` values, whatever order its members end up in. ⚠⚠ Under `none` a number
   would never RENDER — this catches the stale DATA, which is what would
   contradict itself the moment anybody flipped the mode back.

   ── ⚠ FOOTNOTE: THE SUPERSEDED ASSERTION (`E164`) ─────────────────────────
   ⚠ Live until `E557`, quoted not deleted:

       check(
         "E378/5 — Messages is step 1 now that it has a model",
         /\{ n: 1, label: "Messages", href: "\/messages" \}/.test(navLib),
         "E379 built the Message model, so the sequence no longer opens on a dead end"
       );

   ⚠ Its reasoning was right for its moment and is kept above this block. */
check(
  "E557/2 — the /community set carries no `n:` values",
  !/\bn:\s*\d+/.test(
    /"\/community": \[[\s\S]*?\n  \],/.exec(navLib)?.[0]?.replace(/\/\*[\s\S]*?\*\//g, "") ?? "FAIL"
  ),
  "a number under `none` is stale data waiting to contradict the order"
);
/* ⚠ AND IT LOST ITS `early` PILL — a readiness pill on a working feature is the
   same lie in the other direction. */
check(
  "E378/5 — Messages no longer carries an `early` pill",
  !/label: "Messages", href: "\/messages", state:/.test(navLib)
);
/* ⚠ THE `/community` MODE ASSERTION MOVED — it is `E557/1`, beside the other
   mode check, and its superseded text is quoted there. Two assertions of one
   fact was the thing being removed, so nothing is re-stated here. */
check(
  "E378/5 — Find a Mentor is gone from every label and title",
  !/label: "Find a Mentor"/.test(navLib) &&
    !/title: "Find a Mentor/.test(bodies.get(join("src", "app", "(app)", "community", "mentors", "page.tsx")) ?? "")
);
/*
  ⚠⚠ THE ROUTE FREEZE. THIRTEEN ROUTES, EACH ASSERTED BY EXACT STRING SO NOTHING
  MOVES ONE BY ACCIDENT.

  ⚠ IT FIRED ON 2026-09-04 AND THAT IS THE GUARD DOING ITS JOB, NOT BEING IN THE
  WAY. `E378` shipped this list with the note *"⚠⚠ NO ROUTE MOVED. This was a
  LABEL brief; every href is unchanged."* — which was true of `E378` and is the
  sentence `P1-ALL-E380` deliberately broke.

  ⚠⚠ SO THE VALUE IS UPDATED AND NOTHING ELSE IS: `/contracts` -> `/orders`.
  SCOTT, 2026-09-04: *"remove contract. we will not have that."* The count is
  still thirteen, the match is still an EXACT quoted string, and NO ENTRY WAS
  REMOVED OR LOOSENED TO A PREFIX. A deliberate move updates one value on the
  record; an accidental one still fails.

  ⚠ `E380` MOVED EXACTLY ONE ROUTE. If a second entry in this list ever needs
  changing in the same commit, that is a different brief.
*/
for (const href of [
  /* ⚠ `/settings/packages` -> `/my-services` (`P1-ALL-E533`): the seller surface
     left Settings so it would stop wearing the SETTINGS eyebrow and tab row.
     ⚠⚠ `/find-work` STAYS — Scott ruled it accurate and already a verb phrase,
     so it does NOT move to `/work` (which the public Seller page holds). */
  "/learn", "/create-work", "/find-work", "/packages", "/my-services",
  /* ⚠ WAS `/contracts` UNTIL `P1-ALL-E380` — the ToS is the MSA and the Work
     Order is the SOW, so there is no Contract record for a route to name. */
  /* ⚠ `/finances` -> `/payments` (`P1-ALL-E533`). */
  "/orders", "/pay", "/payments", "/community", "/community/forums",
  /*
    ⚠⚠ `/community/teams` AND `/community/mentors` LEFT THIS LIST (`E593` WS-A).
    ⚠ SUPERSEDED, quoted not deleted (`E164`): `"/community/teams", "/community/mentors",`
    ⚠⚠⚠ THE ROUTES DID NOT GO ANYWHERE. `E593` folded them into Community as
    SECTIONS, so `nav.ts` is simply no longer where their survival is guaranteed
    — exactly what `E560` did for `/messages`, two entries above.
    ⚠ THE ASSERTION IS MOVED, NOT DROPPED: see the block directly below, which
    checks the file that DOES guarantee them. Deleting it outright would have
    lost the guard this loop exists to provide.
  */
  /* ⚠⚠ `/connect` IS ADDED, NOT SUBSTITUTED (`P2-J3-E591` WS-A). The route
     SPLIT — the profile became `/connect` and `/community` kept the people — so
     BOTH are live nav destinations and both are frozen. ⚠ `/community` is
     unchanged in this list on purpose: it did not move, it stopped carrying a
     second page. ⚠ The count is now fourteen. */
  "/connect",
  /* ⚠⚠ `/messages` LEFT THIS LIST (`P2-ALL-E560` STAGE 1, 2026-09-18).
     ⚠ SUPERSEDED, quoted not deleted (`E164`): `"/messages",` was the last entry.
     ⚠⚠ THE ROUTE DID NOT GO ANYWHERE — Messages became its own surface, reached
     from the BAND'S UTILITY CLUSTER instead of from a nav list, so `nav.ts` is
     simply no longer where its survival is guaranteed. ⚠ THE ASSERTION IS MOVED,
     NOT DROPPED — see the pair directly below, which checks the two files that
     DO guarantee it. ⚠ Deleting it outright would have lost the guard that this
     loop exists to provide. */
]) {
  check(`E378/5 — route ${href} still exists in the nav`, navLib.includes(`"${href}"`));
}

/*
  ── ⚠⚠⚠ THE FOLDED PAGES ARE STILL REACHABLE (`P2-J3-E593` WS-A) ──────────

  ⚠ `E593` removed the `Colleagues`, `Mentoring` and `Teams` TABS and kept every
  page. ⚠⚠ THE BRIEF'S OWN CONDITION IS *"NOTHING MAY BECOME UNREACHABLE"*, and
  this is where that is held: the Community surface must LINK to all three.

  ⚠⚠⚠ THIS IS A STRONGER GUARD THAN THE ONE IT REPLACES, AND THAT IS THE POINT.
  The route freeze above only asked whether a string appeared in `nav.ts`. A
  route can sit in `nav.ts` and be reachable from nowhere — which is `E579`
  exactly, and is why `/payments` kept a menu entry it was told to delete.
  ⚠ This asks the question that matters: **is there a link to it?**

  ⚠⚠ AND IT IS CHECKED IN EVERY BRANCH, not just the happy one. Two of these
  links did not exist when `E593` began — Mentors rendered one only above four
  follows, and a member of somebody else's team had none at all. ⚠ Both were
  found at `E593`'s premise gate, in CC's own `E591` work, and both are fixed.
  ⚠ A link inside a conditional that a real viewer can fail is not a door.
*/
const COMMUNITY_SURFACE = [
  join("src", "app", "(app)", "community", "page.tsx"),
  join("src", "components", "community", "CommunityRail.tsx"),
]
  .map((f) => bodies.get(f) ?? "")
  .join("\n");

check(
  "E593/5 — the Community surface was found by the scan",
  COMMUNITY_SURFACE.length > 500,
  `${COMMUNITY_SURFACE.length} chars`
);
for (const href of ["/community/colleagues", "/community/mentors", "/community/teams"]) {
  check(
    `E593/5 — ⚠⚠ ${href} is LINKED from Community, not merely in the nav`,
    COMMUNITY_SURFACE.includes(`"${href}"`)
  );
}
/*
  ⚠⚠ AND THE TWO LINKS THAT WERE CONDITIONAL ARE NOW UNCONDITIONAL. Asserting
  only that the href appears would pass on the exact code that was broken —
  the string was present both times, inside a branch a real viewer could miss.
  ⚠ So the SHAPE is asserted: neither link sits behind a count threshold.
*/
const RAIL = bodies.get(join("src", "components", "community", "CommunityRail.tsx")) ?? "";
check(
  "E593/5 — ⚠ the Mentors link is not gated on a follow count",
  !/following\.length > 4 &&[\s\S]{0,120}\/community\/mentors/.test(RAIL)
);
/*
  ── ⚠⚠⚠ THE CONNECT ROW RESPECTS CAPABILITY (`P2-J3-E593` WS-A) ───────────

  ⚠ `Service Products` points at `/my-services`, which requires
  `canProvideServices` — and **Connect is in the BUYER menu** (`REQUESTER_NAV`,
  Scott's `E588` WS-C ruling). ⚠⚠ WITHOUT A FILTER A BUYER SEES A TAB THAT
  BOUNCES THEM TO `/dashboard?noaccess=1`. That is the `E579` family: an entry
  that looks like a door and is not.

  ⚠⚠⚠ `check:nav-reachable` CANNOT CATCH THIS. Its §1 asks whether an item's
  DECLARED capability matches its ROUTE'S — never whether the VIEWER can open
  it. Both are true here and the door would still be dead. So it is asserted
  here instead.

  ⚠ NOT PROVEN IN A BROWSER, AND THE REASON IS RECORDED RATHER THAN WORKED
  AROUND: `_auth.ts` signs in as `test3@panameer.com`, which is provider-only
  (measured), and `E580` means no buyer seed password can be signed in with.
  ⚠⚠ SEEDING OR RESETTING A PASSWORD TO MAKE THIS WALKABLE IS `E564` AND `E580`
  RESPECTIVELY — both forbidden by name. The shape is asserted in Node instead,
  which is `E569`'s precedent exactly.
*/
const CONNECT_TABS_LIB = bodies.get(join("src", "lib", "connect-tabs.ts")) ?? "";
check("E593/5 — the Connect tab filter exists", CONNECT_TABS_LIB.length > 200);
check(
  "E593/5 — ⚠⚠ it filters on the VIEWER's capability, not on the route",
  /hasCapability\(viewer, t\.requires\)/.test(CONNECT_TABS_LIB)
);
check(
  "E593/5 — ⚠ a tab with no `requires` is shown to everyone signed in",
  /!t\.requires \|\|/.test(CONNECT_TABS_LIB)
);
/*
  ⚠⚠ IT REMOVES, IT DOES NOT GREY. `PageTabs` records the rule it is keeping
  faith with — *"UPCOMING STEPS STAY CLICKABLE. GREYING IS A STATE, NOT A
  LOCK."* A greyed tab says *"not yet"*, and a buyer will never have
  `canProvideServices`, so *"not yet"* would be a lie.
*/
check(
  "E593/5 — ⚠ it filters rather than disabling",
  /\.filter\(/.test(CONNECT_TABS_LIB) && !/disabled|aria-disabled/.test(CONNECT_TABS_LIB)
);
/*
  ⚠⚠⚠ EVERY PAGE THAT DRAWS THE ROW GOES THROUGH IT. One page left on the raw
  set would show a buyer the dead tab on that page only — the hardest kind of
  bug to see, because the row looks right everywhere else.
*/
const CONNECT_PAGES = [
  ["community", "page.tsx"], ["community", "colleagues", "page.tsx"],
  ["community", "forums", "page.tsx"], ["community", "mentors", "page.tsx"],
  ["community", "score", "page.tsx"], ["community", "teams", "page.tsx"],
  ["connect", "page.tsx"], ["messages", "page.tsx"],
].map((seg) => join("src", "app", "(app)", ...seg));
for (const f of CONNECT_PAGES) {
  const body = bodies.get(f) ?? "";
  check(
    `E593/5 — ⚠ ${f.split(join("(app)", ""))[1] ?? f} draws the row through the filter`,
    /connectTabs\(viewer, unread\)/.test(body) && !/PAGE_TABS\["\/connect"\]/.test(body)
  );
}

check(
  "E593/5 — ⚠ every Teams branch links out",
  (RAIL.match(/\/community\/teams/g) ?? []).length >= 3,
  `${(RAIL.match(/\/community\/teams/g) ?? []).length} link(s) — owner, member and neither each need one`
);
/*
  ── ⚠⚠ `/messages` SURVIVES WHERE IT ACTUALLY LIVES (`P2-ALL-E560` STAGE 1) ───

  ⚠ A route reached from the utility cluster is guaranteed by its ACCESS RULE and
  its PROXY MATCHER, not by a nav array. ⚠⚠ ASSERTED AS A PAIR AND IN BOTH
  DIRECTIONS, because the two files disagreeing is the failure mode the public
  allowlist spec already exists to catch.
*/
check(
  "E560/1 — /messages is still access-gated",
  /\{ prefix: "\/messages", requires: "authenticated" \}/.test(
    readFileSync(join("src", "lib", "route-access.ts"), "utf8")
  ),
  "the cluster icon points at it, so losing the gate would expose it"
);
check(
  "E560/1 — /messages is still in the proxy matcher",
  /"\/messages\/:path\*"/.test(readFileSync(join("src", "proxy.ts"), "utf8")),
  "route-access and proxy must agree in both directions"
);
/* ⚠⚠ AND THE OLD NAME IS NOW BANNED FROM THE MEMBER-FACING NAV, so nobody
   re-adds it from a stale link or a URL segment the way `9ae05d7` did.
   ⚠ `/admin/contracts` IS DELIBERATELY EXEMPT — see the `E380` report: it was
   NOT renamed, because `/admin/work-orders` already exists with the label
   `Work Orders` and renaming would have shipped two identical admin entries. */
check(
  "E380 — no member-facing nav entry points at /contracts",
  !/"\/contracts"/.test(navLib),
  "the route moved to /orders; a Contract record does not exist"
);

/* ── 6 · THE DUPLICATE CARDS ARE GONE, PARKED NOT DELETED ─────────────────── */
const communityLib = bodies.get(join("src", "lib", "community.ts")) ?? "";
const communityPage = bodies.get(join("src", "app", "(app)", "community", "page.tsx")) ?? "";
check(
  "E378/6 — communitySections() is commented out, not deleted",
  !/^\s*export function communitySections/m.test(communityLib) &&
    readFileSync(join("src", "lib", "community.ts"), "utf8").includes("communitySections"),
  "it must survive on disk inside a comment"
);
check(
  "E378/6 — the /community page renders no section cards",
  !/sections\.map\(/.test(communityPage)
);
/* ⚠ THE PILLS WERE NOT DROPPED — they moved onto the tab. */
check(
  "E378/6 — the readiness pills moved onto the tab",
  /state\?: "live" \| "early"/.test(navLib) && /t\.state === "early"/.test(pageTabs)
);

/* ── 7 · ONE LIST, NOT TWO ────────────────────────────────────────────────── */
const learnSteps = bodies.get(join("src", "lib", "learn-steps.ts")) ?? "";
check(
  "E378/7 — the tab handle lives on the existing step type",
  /handle\?: string;/.test(learnSteps) && /export type LearnStepLabel/.test(learnSteps),
  "two lists is how the promise and the product drift apart"
);
check(
  "E378/7 — no second step list was created",
  ![...bodies.entries()].some(
    ([f, b]) => f !== join("src", "lib", "learn-steps.ts") && /LEARN_TAB_STEPS|LEARN_HANDLES/.test(b)
  )
);

// ---------------------------------------------------------------------------

/* ══ GUARD 4 · TEAMS RENDERS BOTH SETS, OR IT IS BROKEN (`P2-J3-E567` WS-C) ══

   ⚠⚠ THE REGRESSION TO FEAR IS A SHAPE, NOT A RENDER — and a shape is catchable
   in Node. It needs no account, no browser and no seed, which is what makes this
   guard possible at all: THE SEED HAS NO DUAL-ROLE ACCOUNT, so no browser test
   can sign in as somebody holding both capabilities.
   ⚠ Measured 2026-09-18: `test3@panameer.com` is provider-only, and 10 real
   people hold BOTH a coordinator and a provider job (`E456`).

   ⚠⚠⚠ THE ANTI-PATTERN THIS EXISTS TO CATCH IS NAMED IN `E558` WS-D's OWN
   COMMIT: "one undifferentiated view with a single isCoordinator boolean
   choosing one CTA — a shape that structurally could not show both sets."
   ⚠ A dual-role person must see BOTH section sets in ONE render.

   ⚠ WHAT THIS GUARD DOES NOT PROVE: that a dual-role person actually SEES both
   sets. It proves the code is SHAPED to allow it. The render half stays
   unverifiable until the seed has such an account — recorded in the matrix, and
   deliberately NOT fixed by adding one, because seed row counts are quoted by
   other gates and briefs including the "10 dual-role" figure itself.

   ⚠ COMMENTS ARE STRIPPED — `bodies` holds stripped sources — so a quoted
   anti-pattern in a docblock can neither satisfy nor trip these. */
{
  const teamsPage = bodies.get(TEAMS_PAGE) ?? "";
  const teamSections = bodies.get(TEAM_SECTIONS) ?? "";
  check("GUARD 4 — the Teams page was found by the scan", teamsPage.length > 0, TEAMS_PAGE);
  check(
    "GUARD 4 — the Teams sections component was found",
    teamSections.length > 0,
    TEAM_SECTIONS
  );

  /* ⚠ TWO INDEPENDENT CALLS, ONE PER CAPABILITY. */
  check(
    "GUARD 4 — Teams gates on canProvideServices via hasCapability()",
    /hasCapability\(\s*viewer\s*,\s*"canProvideServices"\s*\)/.test(teamsPage)
  );
  check(
    "GUARD 4 — Teams gates on canCoordinate via hasCapability()",
    /hasCapability\(\s*viewer\s*,\s*"canCoordinate"\s*\)/.test(teamsPage)
  );

  /* ⚠⚠ NEVER `roleWord()` — it is the one-word header badge and it is
     SINGLE-VALUED ON PURPOSE. Gating on it would force the either/or the data
     says is wrong for 10 people. */
  check(
    "GUARD 4 — ⚠⚠ roleWord() appears nowhere in the Teams path",
    !/\broleWord\b/.test(teamsPage) && !/\broleWord\b/.test(teamSections),
    "roleWord is single-valued; gating on it cannot show both sets"
  );

  /* ⚠⚠⚠ NO EITHER/OR BETWEEN THE TWO SETS. They must be INDEPENDENT statements
     — `{a && <X/>}` and `{b && <Y/>}` — never one expression choosing between
     them. A ternary whose branches are the two components, either way round, is
     the exact shape `E558` WS-D removed. */
  const ternaryBetweenSets =
    /\?[\s\S]{0,400}<ProviderTeamSections[\s\S]{0,400}:[\s\S]{0,400}<RecruiterTeamSections|\?[\s\S]{0,400}<RecruiterTeamSections[\s\S]{0,400}:[\s\S]{0,400}<ProviderTeamSections/;
  check(
    "GUARD 4 — ⚠⚠ NO TERNARY CHOOSES BETWEEN THE TWO SECTION SETS",
    !ternaryBetweenSets.test(teamsPage),
    "a dual-role person must see BOTH, so neither may be the other's else-branch"
  );

  /* ⚠ AND EACH RENDERS FROM ITS OWN GUARD EXPRESSION. */
  check(
    "GUARD 4 — the provider set renders from its own capability check",
    /\{\s*canProvide\s*&&\s*\(?[\s\S]{0,200}<ProviderTeamSections/.test(teamsPage)
  );
  check(
    "GUARD 4 — the recruiter set renders from its own capability check",
    /\{\s*canCoordinateTeams\s*&&\s*\(?[\s\S]{0,200}<RecruiterTeamSections/.test(teamsPage)
  );

  /* ⚠ THE TWO FLAGS ARE COMPUTED SEPARATELY, not derived from one another — a
     single boolean with a negation is an either/or wearing two names. */
  check(
    "GUARD 4 — ⚠ the two capability flags are independent, not one negated",
    !/canCoordinateTeams\s*=\s*!\s*canProvide/.test(teamsPage) &&
      !/canProvide\s*=\s*!\s*canCoordinateTeams/.test(teamsPage)
  );
}

if (failures.length > 0) {
  console.error(`check:community — ${failures.length} FAILED, ${pass} passed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`check:community — ${pass}/${pass} passed`);
