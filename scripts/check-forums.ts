import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";

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
  check(
    "3 — a signed-out viewer is refused",
    /if \(!viewer\) return false;/.test(forums),
    "a stranger sees THAT the forum exists and never its content"
  );
  check(
    "3 — enrolment grants access",
    /learnEnrollment\.findFirst[\s\S]{0,200}?learning_path_id: learningPathId/.test(forums)
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

  /* ── 4 · A PATH BOARD NEVER APPEARS IN listBoards() ─────────────────────── */
  check(
    "4 — listBoards excludes path boards",
    /listBoards[\s\S]{0,400}?where: \{ learning_path_id: null \}/.test(forums),
    "twelve mostly-empty rooms beside four that can fill is the fragmentation forums.ts warns about"
  );

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
