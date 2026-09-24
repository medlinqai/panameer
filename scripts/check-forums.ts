import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { getForumsHome } from "@/lib/forums";

/**
 * check:forums — forums had NO harness at all until `P1-J3-E383`.
 *
 * ⚠⚠ IT READS BOTH THE SOURCE AND THE DATABASE, and the split is deliberate:
 * the ACCESS RULES are asserted against the LIB (that is where they live and
 * where they can be broken), and the ONE-BOARD-PER-PATH invariant is asserted
 * against the LIVE LIBRARY, because a fixture cannot tell you that the seed and
 * the backfill actually agreed.
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

const SELF = join("scripts", "check-forums.ts");
const files = [...walk("src"), ...walk("scripts"), ...walk("prisma")].filter((f) => f !== SELF);
const bodies = new Map(files.map((f) => [f, strip(readFileSync(f, "utf8"))]));

const FORUMS = join("src", "lib", "forums.ts");
const forums = bodies.get(FORUMS) ?? "";
const forumsRaw = readFileSync(FORUMS, "utf8");
const learnAdmin = bodies.get(join("src", "lib", "learn-admin.ts")) ?? "";
const learnHome = bodies.get(join("src", "lib", "learn-home.ts")) ?? "";
const seed = bodies.get(join("prisma", "seed-learn.ts")) ?? "";
const pathPage = bodies.get(join("src", "app", "learn", "[slug]", "page.tsx")) ?? "";
const schema = strip(readFileSync(join("prisma", "schema.prisma"), "utf8")).replace(
  /\/\/\/[^\n]*/g,
  " "
);

/* The four seeded general boards. Their slugs are the contract. */
const GENERAL_SLUGS = ["implementation", "troubleshooting", "getting-started", "the-business"];

async function main() {
  check("lib/forums.ts is on disk", forums.length > 0);

  /* ── 1 · A BOARD IS A PATH BOARD **OR** ONE OF THE FOUR. NEVER BOTH. ────── */
  check(
    "1 — ForumBoard carries learning_path_id",
    /learning_path_id String\?/.test(schema)
  );
  check("1 — and it is indexed", /@@index\(\[learning_path_id\]\)/.test(schema));
  const generalRows = await prisma.forumBoard.findMany({
    where: { learning_path_id: null },
    select: { slug: true },
  });
  const generalSlugs = generalRows.map((b) => b.slug).sort();
  check(
    "1 — the ONLY null-path boards are the four seeded ones",
    generalSlugs.length === 4 && GENERAL_SLUGS.slice().sort().every((s, i) => generalSlugs[i] === s),
    `[${generalSlugs.join(", ")}]`
  );
  const orphan = await prisma.forumBoard.count({
    where: { learning_path_id: { not: null }, learningPath: { is: null } },
  });
  check("1 — no path board points at a path that is gone", orphan === 0, `${orphan}`);

  /* ── 2 · ⚠⚠ AT MOST ONE BOARD PER PATH ──────────────────────────────────── */
  const dupes = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
    `select count(*)::bigint as n from (
       select learning_path_id from forum_boards
       where learning_path_id is not null
       group by learning_path_id having count(*) > 1
     ) d`
  );
  check(
    "2 — no learning path has more than one board",
    Number(dupes[0].n) === 0,
    `${dupes[0].n} path(s) with 2+ boards — two rooms for one conversation splits the people who found the first`
  );
  /* ⚠ AND THE MECHANISM THAT KEEPS IT TRUE: creation is an UPSERT by slug, not
     a create. A plain `create` is how a second board appears. */
  check(
    "2 — ensurePathBoard upserts rather than creates",
    /export async function ensurePathBoard[\s\S]{0,900}?forumBoard\.upsert\(/.test(forums) &&
      !/export async function ensurePathBoard[\s\S]{0,900}?forumBoard\.create\(/.test(forums)
  );

  /* ── 3 · ⚠⚠ ACCESS — READ AND POST — IS ENROLMENT **OR** TEACHING ───────── */
  check(
    "3 — canAccessPathForum is in the lib",
    /export async function canAccessPathForum/.test(forums)
  );
  /* ⚠⚠ BOTH ASSERTIONS BELOW WERE REWRITTEN AT `P2-A4-E610`, AND THIS IS
     `check:rollup`'S CASE, NOT `check:cert-skills`' — the RULING changed, the
     code did not drift. They pinned the MECHANISM (`return false`, a
     `findFirst` per path) rather than the rule, and the mechanism moved when
     the two conditions were extracted so `getForumsHome` could stop restating
     them. ⚠ The RULE each one encodes is unchanged and is asserted harder in
     §9/§9b/§9c against the extracted function.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   /if \(!viewer\) return false;/.test(forums)
     //   /learnEnrollment\.findFirst[\s\S]{0,200}?learning_path_id: learningPathId/.test(forums) */
  check(
    "3 — a signed-out viewer is refused",
    /if \(!viewer\) return none;/.test(forums),
    "a stranger sees THAT the forum exists and never its content"
  );
  check(
    "3 — enrolment grants access",
    /learnEnrollment\.findMany[\s\S]{0,200}?user_id: viewer\.userId/.test(forums)
  );
  /* ⚠⚠ THE INSTRUCTOR HALF USES THE EXTRACTED PREDICATE, AND `expert_person_id`
     ALONE IS THE KNOWN-WRONG ANSWER THAT HAS ALREADY COST ONCE. */
  check(
    "3 — the instructor rule is teachesPathWhere, not a second query",
    /teachesPathWhere\(person\.id\)/.test(forums),
    "expert_person_id alone would lock Marelise out of her own 33 lessons"
  );
  check(
    "3 — forums.ts never writes expert_person_id itself",
    !/expert_person_id/.test(forums),
    "a second OR with expert_person_id is the third-copy-of-isPlayable mistake"
  );
  check(
    "3 — the predicate is exported once, from learn-home.ts",
    /export function teachesPathWhere/.test(learnHome)
  );
  const predicateCopies = [...bodies.entries()].filter(
    ([f, b]) => f !== join("src", "lib", "learn-home.ts") && /lessons: \{ some: \{ expert_person_id/.test(b)
  );
  check(
    "3 — only one copy of the per-lesson teaching query exists",
    predicateCopies.length === 0,
    predicateCopies.map(([f]) => f).join(", ")
  );
  /* ⚠ READ AND POST BOTH. A gate on one of them is not a closed room. */
  check(
    "3 — getBoard gates a path board",
    /getBoard[\s\S]{0,900}?canAccessPathForum\(viewer, gate\.learning_path_id\)/.test(forums)
  );
  check(
    "3 — createThread gates a path board",
    /createThread[\s\S]{0,1400}?board\.learning_path_id[\s\S]{0,300}?canAccessPathForum\(/.test(forums)
  );
  check(
    "3 — createPost gates a path board",
    /createPost[\s\S]{0,1400}?thread\?\.board\?\.learning_path_id[\s\S]{0,300}?canAccessPathForum\(/.test(
      forums
    )
  );
  /* ⚠ AND A DEEP LINK BY THREAD ID IS NOT A WAY ROUND THE DOOR. */
  check(
    "3 — getThread gates a thread inside a path board",
    /getThread[\s\S]{0,900}?canAccessPathForum\(/.test(forums)
  );
  /* ⚠ ENROLLING IS JOINING — no membership model was invented. */
  check(
    "3 — no BoardMember model was added",
    !/model BoardMember\b/.test(schema) && !/model ForumMember\b/.test(schema)
  );

  /* ── 4 · ⚠⚠⚠ A PATH BOARD IS LISTED ONLY TO SOMEBODY IN IT ───────────────

     ⚠⚠ THE OLD ASSERTION GUARDED `listBoards()`, WHICH NOTHING CALLED, AND THE
     RULE IT STATED — *"a path board never appears in the general listing"* —
     IS FALSE ON THE LIVE PATH. Measured and RENDERED 2026-09-24 at
     `/community/forums` as a teacher: **4 path boards listed beside the 4
     general rooms**, each marked `Teach`. ⚠ That is `E591`'s design: the rail
     is *"Your Groups"*.

     ⚠⚠⚠ SO THIS ASSERTS THE RULE THAT IS ACTUALLY LIVE, AGAINST THE LIVE
     LISTING AND THE REAL DATABASE: a stranger — nothing enrolled, nothing
     taught — sees the general rooms and **zero** path boards, while somebody
     who teaches sees theirs. ⚠ A source grep could not have told the
     difference; that is why this one runs the function.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   check("4 — listBoards excludes path boards",
     //     /listBoards[\s\S]{0,400}?where: \{ learning_path_id: null \}/.test(forums), …); */
  check(
    "4 — listBoards is gone rather than dead",
    !/export async function listBoards/.test(forums),
    "E164 preserves superseded decisions in comments, not dead exports"
  );
  {
    const pathBoardIds = new Set(
      (
        await prisma.forumBoard.findMany({
          where: { learning_path_id: { not: null } },
          select: { id: true },
        })
      ).map((b) => b.id)
    );
    /* ⚠⚠ COUNT > 0 (`E586`) — with no path boards the comparison proves nothing. */
    check("4 — there are path boards to hide (E586)", pathBoardIds.size > 0, `${pathBoardIds.size}`);

    const stranger = await prisma.user.findFirst({
      where: {
        learnEnrollments: { none: {} },
        person: { learnLessons: { none: {} }, learnPaths: { none: {} } },
      },
      select: { id: true },
    });
    const teacher = await prisma.person.findFirst({
      where: { learnLessons: { some: {} } },
      select: { user_id: true },
    });
    check(
      "4 — the probe found a stranger and a teacher (E586)",
      Boolean(stranger && teacher?.user_id),
      "two viewers with DIFFERENT relationships, or the comparison is one value twice"
    );

    if (stranger && teacher?.user_id) {
      const strangerRooms = (await getForumsHome({ userId: stranger.id } as never)).rooms as {
        slug: string;
      }[];
      const teacherRooms = (await getForumsHome({ userId: teacher.user_id } as never)).rooms as {
        slug: string;
      }[];
      const slugToId = new Map(
        (
          await prisma.forumBoard.findMany({ select: { id: true, slug: true } })
        ).map((b) => [b.slug, b.id])
      );
      const strangerPaths = strangerRooms.filter((r) => pathBoardIds.has(slugToId.get(r.slug) ?? ""));
      const teacherPaths = teacherRooms.filter((r) => pathBoardIds.has(slugToId.get(r.slug) ?? ""));
      check(
        "4 — ⚠⚠ a stranger is listed NO path board",
        strangerPaths.length === 0,
        `${strangerPaths.length} leaked: ${strangerPaths.map((r) => r.slug).join(", ")}`
      );
      /* ⚠⚠⚠ AND THE OTHER HALF, WITHOUT WHICH THE FIRST IS SATISFIED BY A
         LISTING THAT SHOWS NOBODY ANYTHING. Two zeros agree. */
      check(
        "4 — ⚠⚠ and somebody who teaches IS listed theirs",
        teacherPaths.length > 0,
        `${teacherPaths.length} — if zero, the rail has stopped listing rooms rather than started hiding them`
      );
    }
  }

  /* ── 4b · ⚠⚠ THE TEASER LEAKS NO CONTENT ────────────────────────────────── */
  check(
    "4b — getPathForumTeaser exists",
    /export async function getPathForumTeaser/.test(forums)
  );
  const teaserType = /export type PathForumTeaser = \{[\s\S]*?\};/.exec(forumsRaw)?.[0] ?? "";
  check("4b — the teaser type was found by the scan", teaserType.length > 0);
  /* ⚠⚠ A COUNT IS A FACT ABOUT THE ROOM; A TITLE IS A THING SOMEBODY WROTE.
     Adding any of these to the payload must fail this build. */
  for (const leak of ["title", "body", "snippet", "author", "excerpt", "lastPost", "latest"]) {
    check(
      `4b — the teaser payload carries no ${leak}`,
      !new RegExp(`\\b${leak}`, "i").test(teaserType),
      "a non-member may learn how many questions exist, never what they say"
    );
  }
  /* ⚠ COMMENTS STRIPPED BEFORE TESTING, AND THAT WAS A REAL BUG IN THIS
     ASSERTION: the function's own warning comment contains the literal example
     `threads: { select: { title: true } }`, so the first version matched ITS OWN
     WARNING TEXT and failed a correct implementation. Assert on CODE. */
  const teaserFn = strip(
    /export async function getPathForumTeaser[\s\S]*?\n}/.exec(forumsRaw)?.[0] ?? ""
  );
  check("4b — the teaser function was found by the scan", teaserFn.length > 0);
  check(
    "4b — the teaser selects counts only, never thread fields",
    !/threads: \{\s*(orderBy|take|select)/.test(teaserFn),
    "the moment a title enters this select it can reach a non-member"
  );
  /* ⚠ AND THE PAGE RENDERS NO CONTENT EITHER. */
  check(
    "4b — the path page renders no thread title from the teaser",
    !/forum\.(title|threads\[|latest|lastPost|author)/.test(pathPage)
  );

  /* ── 4c · THE COUNT RENDERS ONLY ABOVE ZERO ─────────────────────────────── */
  check(
    "4c — the path page guards the count against zero",
    /forum\.threads > 0/.test(pathPage),
    "a forum advertising 0 threads is an anti-advertisement"
  );

  /* ── 5 · NOTHING DELETES A BOARD, A THREAD OR A POST ────────────────────── */
  for (const model of ["forumBoard", "forumThread", "forumPost"]) {
    const deleters = [...bodies.entries()]
      .filter(([, b]) => new RegExp(`prisma\\.${model}\\.delete(Many)?\\(`).test(b))
      .map(([f]) => f);
    check(`5 — nothing deletes a ${model}`, deleters.length === 0, deleters.join(", "));
  }
  /* ⚠⚠ AND `deletePath`'s EXISTING GUARD NOW COUNTS THREADS — the narrow case is
     an instructor's thread on a path with ZERO enrolments, which passes both of
     the checks that were already there. */
  check(
    "5 — deletePath counts the forum's threads",
    /forumBoards: \{ select: \{ _count: \{ select: \{ threads: true \} \} \} \}/.test(learnAdmin) &&
      /threads > 0\) \{/.test(learnAdmin),
    "an instructor can post without enrolling, so enrolments and courses are both zero"
  );
  /* ⚠ AND THE TWO EXISTING MESSAGES WERE NOT TOUCHED. */
  check(
    "5 — the enrolment refusal message is unchanged",
    /Unpublish it instead of deleting it/.test(learnAdmin)
  );
  check(
    "5 — the courses refusal message is unchanged",
    /Delete those first — deleting the path would take every section and lesson/.test(learnAdmin)
  );
  /* ⚠ AND THE FK IS STILL Cascade — the guard is what makes it safe, not the FK. */
  check(
    "5 — the board FK was not switched to Restrict",
    !/learningPath[\s\S]{0,160}?onDelete: Restrict/.test(schema)
  );

  /* ── 6 · EVERY PATH HAS EXACTLY ONE BOARD, IN THE LIVE LIBRARY ──────────── */
  const paths = await prisma.learningPath.count();
  const withBoard = await prisma.learningPath.count({ where: { forumBoards: { some: {} } } });
  check(
    "6 — every learning path has a board",
    paths === withBoard,
    `${withBoard}/${paths} — createPath, the seed and the backfill all call ensurePathBoard`
  );
  check(
    "6 — createPath makes the board in the SAME transaction",
    /createPath[\s\S]{0,900}?\$transaction[\s\S]{0,900}?ensurePathBoard\(tx, path\)/.test(learnAdmin),
    "a path without its forum must not be a state the database can be in"
  );
  check("6 — the seed makes one too", /ensurePathBoard\(/.test(seed));

  /* ── 7 · NO THIRD COPY OF isPlayable ───────────────────────────────────── */
  const playableDefs = [...bodies.entries()]
    .filter(([, b]) => /function isPlayable\b|const isPlayable\s*=/.test(b))
    .map(([f]) => f);
  check(
    "7 — isPlayable is still defined in exactly two places",
    playableDefs.length === 2,
    playableDefs.join(", ")
  );
  check(
    "7 — forums.ts did not add a third",
    !/isPlayable/.test(forums),
    "reuse pathHasPlayableLessons; do not re-derive playability"
  );

  /* ── 8 · ⚠⚠ EVERY PATH GROUP HAS A PERSON OWNER (`P2-J3-E572`) ──────────── */
  /* ⚠⚠ `learning_path_id` SAYS WHAT A GROUP IS ABOUT; IT DOES NOT SAY WHO OWNS
     IT. The column is NULLABLE because the four general boards have no owner
     until they are retired — so THIS GUARD, not the column, is what requires
     every PATH group to have one. */
  check(
    "8 — ForumBoard carries host_person_id",
    /host_person_id\s+String\?/.test(schema)
  );
  check("8 — and it is indexed", /@@index\(\[host_person_id\]\)/.test(schema));
  /* ⚠⚠ SetNull, NEVER Cascade. Deleting a person must not delete the room and
     everything said in it. An ownerless group is repairable; a deleted
     conversation is not. */
  check(
    "8 — the host FK is SetNull, so deleting a person never deletes the room",
    /hostPerson\s+Person\?\s+@relation\("ForumBoardHost"[^\n]*onDelete: SetNull/.test(schema),
    "Cascade here would delete a whole conversation with its owner"
  );
  const ownerless = await prisma.forumBoard.count({
    where: { learning_path_id: { not: null }, host_person_id: null },
  });
  check(
    "8 — every path group has an owner",
    ownerless === 0,
    `${ownerless} ownerless path group(s) — four ownerless general boards with zero threads between them is what an association-without-an-owner produces`
  );
  /* ⚠⚠⚠ DERIVED ONCE, THEN FROZEN — AND THIS IS THE ASSERTION THAT KEEPS IT
     FROZEN. A live derivation changes owner whenever someone authors more
     lessons; write 20 lessons into a path and you take it over. Tolerable while
     ownership means "you may confirm answers", NOT tolerable once an owner can
     set a price and collect. ⚠ AN OWNER THAT SILENTLY CHANGES IS A BUG WITH A
     BANK ACCOUNT ATTACHED.
     ⚠ A READ is fine — `host_person_id: true` in a select, or a where-clause on
     it. What must stay unique is a WRITE. */
  const BACKFILL = join("prisma", "backfill-path-group-owner.ts");
  check("8 — the one-time backfill script is on disk", (bodies.get(BACKFILL) ?? "").length > 0);
  /*
    ⚠⚠⚠ THE LOOKAHEAD MUST SIT INSIDE IT, NOT AFTER IT (`P2-A3-E612`).
    ⚠ `/host_person_id:\s*(?!true\b)/` COULD NOT TELL A READ FROM A WRITE:
    `\s*` backtracks to zero width, the lookahead then inspects the SPACE rather
    than the word after it, and `host_person_id: true` — the read this
    assertion's own comment says is fine — matched.
    ⚠⚠ IT HAD NEVER FIRED ONLY BECAUSE NO FILE OUTSIDE THE BACKFILL MENTIONED
    THE COLUMN. `check:groups` reads it to assert the four general boards are
    ownerless, and the latent bug surfaced immediately.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   /host_person_id:\s*(?!true\b)/.test(b)
  */
  /*
    ── ⚠⚠⚠ A SECOND LEGITIMATE WRITER: THE FOUNDER (`P2-A3-E619`, ruling 2) ──

    ⚠ SCOTT, 2026-09-22, RULING 2: *"**Anyone can start a group.**"* ⚠⚠ A group
    somebody starts has an owner from its first instant — the person who started
    it — so ruling 2 REQUIRES a second writer of this column. There is no way to
    honour it and keep "exactly one writer".

    ⚠⚠⚠ THE RULE `E572` ACTUALLY STATES IS NOT WEAKENED BY THIS, AND THAT IS THE
    WHOLE ARGUMENT: *"DERIVED ONCE, AT BACKFILL, THEN FROZEN… AN OWNER THAT
    SILENTLY CHANGES IS A BUG WITH A BANK ACCOUNT ATTACHED."* ⚠ The danger is
    RE-COMPUTATION — a helper that reassigns an existing group's owner when
    somebody authors more lessons. **Setting an owner at CREATE is the frozen
    case, not an exception to it.** ⚠⚠ This is `check:rollup`'s case (the ruling
    moved), NOT `check:cert-skills`' (the code drifted).

    ⚠⚠⚠ SO THE EXEMPTION IS NAMED, AND IT IS FENCED BY THE ASSERTION BELOW IT:
    `createGroup` may write this column **only inside a `create`**. The moment
    it writes one in an `update`, the fence fails and the reassignment this rule
    exists to prevent is caught. ⚠ A bare exemption would have licensed exactly
    that — the `check:derived-source` pattern, applied here.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   .filter(([f, b]) => f !== BACKFILL && /host_person_id:(?!\s*true\b)/.test(b))
    //   check("8 — only the one-time backfill writes an owner", writers.length === 0, …)
  */
  const FOUNDER = join("src", "lib", "group-membership.ts");
  const writers = [...bodies.entries()]
    .filter(
      ([f, b]) =>
        f !== BACKFILL && f !== FOUNDER && /host_person_id:(?!\s*true\b)/.test(b)
    )
    .map(([f]) => f);
  check(
    "8 — only the backfill and the founder write an owner",
    writers.length === 0,
    `${writers.join(", ")} — the owner is derived ONCE and frozen; a helper the app calls is how it starts drifting`
  );
  /* ⚠⚠⚠ THE FENCE. The exemption is worth exactly as much as this assertion. */
  const founderBody = bodies.get(FOUNDER) ?? "";
  check("8 — the founder file was found by the scan (E586)", founderBody.length > 0, FOUNDER);
  const founderUpdates = [
    ...founderBody.matchAll(/\.update(Many)?\(\{[\s\S]{0,400}?\}\)/g),
  ].filter((m) => /host_person_id:(?!\s*true\b)/.test(m[0]));
  check(
    "8 — ⚠⚠⚠ the founder sets an owner only on CREATE, never on an update",
    founderUpdates.length === 0,
    `${founderUpdates.length} update(s) write host_person_id — reassigning an existing group's owner is the exact drift E572 forbids`
  );

  /* ── 9 · ⚠⚠⚠ THE ACCESS RULE IS EXACTLY TWO CONDITIONS (`P2-J3-E572` WS-B) ──
     `canAccessPathForum` is ALREADY the rule Scott asked for. This section does
     not change it — it stops it drifting.
     ⚠⚠ THE RULE: a `LearnEnrollment` for THIS viewer and path, **OR**
     `teachesPathWhere`. NOTHING ELSE — no third OR, no role check, no
     capability shortcut, no admin bypass.
     ⚠ ASSERTED ON THE FUNCTION BODY WITH COMMENTS STRIPPED. Rule 12: the house
     style quotes superseded code (`E164`), and a quote is not live code. */
  const accessFnRaw = /export async function pathForumAccess[\s\S]*?\n}/.exec(forumsRaw)?.[0] ?? "";
  check("9 — pathForumAccess was found by the scan", accessFnRaw.length > 0);
  const accessFn = strip(accessFnRaw);

  /* ⚠ A signed-out viewer is refused before anything else. */
  check(
    "9 — a signed-out viewer is refused before anything else",
    /if \(!viewer\) return none;/.test(accessFn),
    "a stranger sees THAT the forum exists and never its content"
  );

  /* ⚠ CONDITION 1 — enrolment, scoped to THIS viewer. */
  check(
    "9 — condition 1 is a LearnEnrollment scoped to this viewer",
    /learnEnrollment\.findMany\(\{\s*where: \{ user_id: viewer\.userId, \.\.\.pathFilter \}/.test(
      accessFn
    ),
    "an enrolment lookup that is not scoped to the viewer is not a gate"
  );

  /* ⚠ CONDITION 2 — teaching, via the ONE extracted predicate. */
  check(
    "9 — condition 2 is teachesPathWhere, the one definition",
    /where: \{ \.\.\.idFilter, \.\.\.teachesPathWhere\(person\.id\) \}/.test(accessFn),
    "expert_person_id alone is the known-wrong answer and has already cost once"
  );

  /* ⚠ THREE QUERIES, NO MORE: the person, the enrolments, the taught paths. */
  const queries = (accessFn.match(/prisma\./g) ?? []).length;
  check(
    "9 — the rule asks the database exactly three things",
    queries === 3,
    `${queries} queries — a fourth is a third condition wearing a different hat`
  );

  /* ⚠⚠ NO ROLE CHECK, NO CAPABILITY SHORTCUT, NO ADMIN BYPASS. */
  for (const forbidden of [
    "is_system_admin",
    "is_support",
    "isAdmin",
    "hasCapability",
    "userClass",
    "USER_CLASS",
    "is_service_provider",
    "is_service_coordinator",
  ]) {
    check(
      `9 — no ${forbidden} shortcut in the access rule`,
      !new RegExp(forbidden).test(accessFn),
      "access is enrolment or teaching; a role is neither"
    );
  }

  /* ⚠⚠⚠ OWNERSHIP IS NOT ACCESS (`E572`). */
  check(
    "9 — ownership is not an access condition",
    !/host_person_id|hostPerson/.test(accessFn),
    "the owner already qualifies through teachesPathWhere; a shortcut makes ownership grant access"
  );

  check(
    "9 — the teaching lookup is NOT filtered to PUBLISHED",
    !/status: "PUBLISHED"/.test(accessFn),
    "an instructor must reach the forum of a draft path they are still recording"
  );

  /* ── 9b · ⚠⚠ `canAccessPathForum` DELEGATES AND DECIDES NOTHING ITSELF ────
     ⚠ It is the single-path shape of the rule, not a second copy of it. If it
     ever grows a query again, it has started re-deriving the answer. */
  const singleRaw =
    /export async function canAccessPathForum[\s\S]*?\n}/.exec(forumsRaw)?.[0] ?? "";
  check("9b — canAccessPathForum was found by the scan", singleRaw.length > 0);
  const singleFn = strip(singleRaw);
  check(
    "9b — canAccessPathForum calls pathForumAccess",
    /await pathForumAccess\(viewer, learningPathId\)/.test(singleFn),
    "the single-path question is answered by the one rule, never re-derived"
  );
  check(
    "9b — canAccessPathForum asks the database nothing of its own",
    !/prisma\./.test(singleFn),
    "a query here means it has started deciding access itself again"
  );

  /* ── 9c · ⚠⚠⚠ NOBODY ELSE IN THIS FILE RESTATES THE RULE (`P2-A4-E610`) ───
     ⚠⚠ DERIVED, NOT LISTED (`E587`). Every top-level function in `forums.ts` is
     found by the scan, and any function whose body reaches for BOTH halves of
     the access rule — `teachesPathWhere` and a `learnEnrollment` read — is a
     restatement of it. ⚠ The set must be exactly the one function.
     ⚠ THIS IS THE ASSERTION `getForumsHome` WOULD HAVE FAILED. It held a
     byte-different second implementation, it was what released thread titles to
     the rail, and §9 never looked at it because §9 names one function.
     ⚠ Count > 0 (`E586`): a scan that finds no functions has not run. */
  const fnBodies = [...forumsRaw.matchAll(/^(?:export )?(?:async )?function (\w+)[\s\S]*?^}/gm)].map(
    (m) => ({ name: m[1], body: strip(m[0]) })
  );
  check(
    "9c — the function scan found something to check",
    fnBodies.length > 5,
    `${fnBodies.length} top-level functions found in forums.ts — a scan with no inputs is not a check`
  );
  const restaters = fnBodies
    .filter((f) => /teachesPathWhere\(/.test(f.body) && /learnEnrollment\./.test(f.body))
    .map((f) => f.name);
  check(
    "9c — exactly one function holds both halves of the access rule",
    restaters.length === 1 && restaters[0] === "pathForumAccess",
    `${restaters.join(", ") || "none"} — a second function reaching for both halves IS a second access rule, and only one of them is guarded above`
  );

  if (failures.length > 0) {
    console.error(`check:forums — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log(`check:forums — ${pass}/${pass} passed`);
  await prisma.$disconnect();
}

main();
