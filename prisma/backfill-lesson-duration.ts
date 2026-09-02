/**
 * BACKFILL `Lesson.duration_seconds` (`P1-J3-E361`).
 *
 * ⚠ IDEMPOTENT. Re-running must not change a correct row: every pass skips rows
 * that already carry a duration, and Pass A recomputes from the same immutable
 * string so a second run writes the same value or nothing.
 *
 * THE ORDER IS PASS A -> PASS C -> PASS B, AND THAT ORDER IS THE POINT:
 *
 *   A  convert the stored `run_time` strings                (Scott's own times)
 *   C  ⚠⚠ CROSS-CHECK those against Vimeo on the 186 lessons that have BOTH,
 *      to PROVE the 60× rule before trusting it            (measure, no writes)
 *   B  fill the remaining playable lessons from Vimeo        (only if C agrees)
 *
 * ⚠ B RUNS ONLY IF C AGREES. A broken conversion rule applied to 300 rows is
 * worse than no durations at all, so C gates B in code rather than in a comment
 * — `--force-b` exists to override it and prints a warning when used.
 *
 * Run:  npx esbuild prisma/backfill-lesson-duration.ts --bundle --platform=node \
 *         --format=cjs --packages=external --alias:@=./src \
 *         --outfile=.harness/backfill-duration.cjs && \
 *       node -r dotenv/config .harness/backfill-duration.cjs dotenv_config_path=.env.local
 *
 * Flags: `--dry` writes nothing · `--force-b` runs Pass B even if C disagreed.
 */
import { prisma } from "@/lib/prisma";
import { parseRunTime, DURATION_CEILING_SECONDS } from "@/lib/lesson-duration";

const DRY = process.argv.includes("--dry");
const FORCE_B = process.argv.includes("--force-b");

/** ⚠ How far apart an XLS value and Vimeo may be and still count as agreeing. */
const AGREE_TOLERANCE_SECONDS = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * ⚠⚠ THE AUTHENTICATED LIBRARY LIST (`P1-J3-E363`), REPLACING oEmbed.
 *
 * ── WHY oEmbed WAS REPLACED, MEASURED NOT ASSUMED ────────────────────────────
 *
 * `E361`'s Pass B used the unauthenticated oEmbed endpoint and filled **9 rows
 * out of ~300**. Measured cause: **145 of 173 candidates returned a payload
 * carrying `domain_status_code` and NO `duration` field at all**, because most of
 * this catalogue is embed-domain-restricted. oEmbed is an EMBED endpoint, and an
 * unauthorised referrer gets metadata withheld.
 * ⚠ THE FIX WAS NOT TO SPOOF A `Referer`. That would have been misrepresenting
 * the request to get data the caller was not granted, and it was refused.
 *
 * An OWNER TOKEN reads Scott's own library directly — not an embed, so the
 * domain restriction does not apply. ⚠ AND IT IS FAR CHEAPER: about ten
 * paginated calls for the whole library instead of 300 individual lookups.
 *
 * ── ⚠⚠ THE TOKEN IS NEVER LOGGED, NEVER PRINTED, NEVER RETURNED ──────────────
 *
 * It reads Scott's entire library. It is read once from `process.env` at the
 * point of use and interpolated straight into the header. `check:duration` scans
 * every source file and fails the build if `VIMEO_ACCESS_TOKEN` appears anywhere
 * but a `process.env` read.
 */
type LibraryVideo = { duration: number; name: string; privacy: string | null };

/**
 * ⚠ THE ID IS EVERYTHING BEFORE THE SLASH. `Lesson.vimeo_ref` holds TWO shapes —
 * `1054816305` and, for unlisted videos, `1059388912/cfafc87f30` (id + privacy
 * hash). The API's `uri` carries no hash, so matching on the whole ref rejects
 * every unlisted row. `learn-admin.ts:819` records a bug where exactly that
 * mistake rejected 243 of 304 rows.
 */
const numericId = (ref: string): string => (ref.split("/")[0] ?? "").trim();

async function fetchLibrary(): Promise<Map<string, LibraryVideo>> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  /*
    ⚠⚠ NO TOKEN MEANS STOP, NOT FALL BACK. The oEmbed path is now KNOWN not to
    work here — falling back to it would fill 9 rows and look like it worked.
  */
  if (!token) {
    throw new Error(
      "VIMEO_ACCESS_TOKEN is not set. Pass B cannot run.\n" +
        "   ⚠ There is deliberately NO oEmbed fallback: it was measured to fail on " +
        "145 of 173 domain-restricted videos, so falling back would quietly fill " +
        "almost nothing and read as success."
    );
  }

  const map = new Map<string, LibraryVideo>();
  let url: string | null =
    "https://api.vimeo.com/me/videos?fields=uri,name,duration,privacy&per_page=100";
  let pages = 0;

  while (url) {
    const r: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.vimeo.*+json;version=3.4",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (r.status === 429) {
      /* ⚠ BACK OFF rather than hammering. */
      await sleep(5000);
      continue;
    }
    if (r.status === 401) {
      /* ⚠ REPORT AND STOP — do not retry with a different auth shape. */
      throw new Error(
        "Vimeo returned 401. The token is wrong or lacks the Private scope. " +
          "Reported and stopping rather than retrying."
      );
    }
    if (!r.ok) throw new Error(`Vimeo returned HTTP ${r.status} listing the library.`);

    const j = (await r.json()) as {
      total?: number;
      data?: { uri?: string; name?: string; duration?: number; privacy?: { view?: string } }[];
      paging?: { next?: string | null };
    };
    pages += 1;
    for (const v of j.data ?? []) {
      const id = (v.uri ?? "").replace("/videos/", "").trim();
      if (!id || typeof v.duration !== "number") continue;
      map.set(id, {
        duration: Math.round(v.duration),
        name: v.name ?? "",
        privacy: v.privacy?.view ?? null,
      });
    }
    if (pages === 1) console.log(`  library reports ${j.total ?? "?"} videos`);
    /* ⚠ FOLLOW `paging.next`, DO NOT COMPUTE PAGE NUMBERS — and it is relative. */
    const next = j.paging?.next ?? null;
    url = next ? (next.startsWith("http") ? next : `https://api.vimeo.com${next}`) : null;
    if (url) await sleep(350);
  }
  console.log(`  fetched ${pages} page(s), ${map.size} videos with a duration`);
  return map;
}

async function main() {
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true, run_time: true, vimeo_ref: true, duration_seconds: true, duration_source: true },
    orderBy: { title: "asc" },
  });
  console.log(`${lessons.length} lessons · ${lessons.filter((l) => l.vimeo_ref).length} with a vimeo_ref`);
  if (DRY) console.log("⚠ --dry: nothing will be written\n");

  /* ── PASS A — convert the stored strings ─────────────────────────────────── */
  console.log("═══ PASS A · convert stored run_time ═══");
  let aFilled = 0;
  const rejects: Record<string, { title: string; raw: string }[]> = {};
  const colonSS: { title: string; raw: string; seconds: number }[] = [];
  const daysRows: { title: string; raw: string; seconds: number | null }[] = [];

  for (const l of lessons) {
    const p = parseRunTime(l.run_time);
    const isDays = /^\d+\s+days?,/.test((l.run_time ?? "").trim());
    if (!p.ok) {
      /* `empty` is the overwhelming majority and is not a finding. */
      if (p.reason !== "empty") {
        (rejects[p.reason] ??= []).push({ title: l.title, raw: p.raw });
      }
      if (isDays) daysRows.push({ title: l.title, raw: p.raw, seconds: null });
      continue;
    }
    if (/^:\d{2}$/.test((l.run_time ?? "").trim())) {
      colonSS.push({ title: l.title, raw: l.run_time!.trim(), seconds: p.seconds });
    }
    if (isDays) daysRows.push({ title: l.title, raw: l.run_time!.trim(), seconds: p.seconds });

    /* ⚠ IDEMPOTENT: already correct means no write at all. */
    if (l.duration_seconds === p.seconds && l.duration_source === "xls") continue;
    if (!DRY) {
      await prisma.lesson.update({
        where: { id: l.id },
        data: { duration_seconds: p.seconds, duration_source: "xls" },
      });
    }
    aFilled += 1;
  }
  console.log(`  filled from XLS: ${aFilled}`);
  for (const [reason, rows] of Object.entries(rejects)) {
    console.log(`  left null — ${reason}: ${rows.length}`);
    if (reason !== "status_word") rows.forEach((r) => console.log(`      "${r.raw}"  ${r.title.slice(0, 62)}`));
    else console.log(`      distinct values: ${JSON.stringify([...new Set(rows.map((r) => r.raw))])}`);
  }
  console.log(`\n  ⚠ EVERY ":SS" ROW (${colonSS.length}) — eyeball these:`);
  colonSS.forEach((r) => console.log(`      "${r.raw}" -> ${r.seconds}s   ${r.title.slice(0, 60)}`));
  console.log(`\n  ⚠ EVERY "N days" ROW (${daysRows.length}):`);
  daysRows.forEach((r) =>
    console.log(`      "${r.raw}" -> ${r.seconds === null ? `REJECTED (over ${DURATION_CEILING_SECONDS}s ceiling)` : `${r.seconds}s`}   ${r.title.slice(0, 52)}`)
  );

  /* ── THE LIBRARY, ONCE. Used by Pass C and Pass B alike. ────────────────── */
  console.log("\n═══ VIMEO LIBRARY (authenticated) ═══");
  const library = await fetchLibrary();

  /*
    ⚠⚠ WHERE SCOTT'S CONTENT ACTUALLY LIVES — the report line that matters most.
    A `vimeo_ref` the owner token cannot see is on a different account, in a team
    library, or deleted. ⚠ DO NOT GO LOOKING FOR ANOTHER ENDPOINT TO COVER THEM.
  */
  const playable = lessons.filter((l) => l.vimeo_ref);
  const missingFromLibrary = playable.filter((l) => !library.has(numericId(l.vimeo_ref!)));
  console.log(`  ⚠ vimeo_refs NOT in the library: ${missingFromLibrary.length} of ${playable.length} playable lessons`);
  missingFromLibrary.slice(0, 15).forEach((l) =>
    console.log(`      ${numericId(l.vimeo_ref!).padEnd(12)} ${l.title.slice(0, 62)}`)
  );
  if (missingFromLibrary.length > 15) console.log(`      …and ${missingFromLibrary.length - 15} more`);

  /* ── PASS C — the cross-check. ⚠⚠ BEFORE PASS B, AND IT WRITES NOTHING ──── */
  console.log("\n═══ PASS C · cross-check the 60× rule against the API ═══");
  const both = lessons.filter((l) => l.vimeo_ref && parseRunTime(l.run_time).ok);
  console.log(`  ${both.length} lessons have BOTH an XLS time and a video`);
  let agree = 0;
  const disagree: { title: string; xls: number; api: number; diff: number }[] = [];
  const cUnreachable: { title: string; id: string }[] = [];
  for (const l of both) {
    const p = parseRunTime(l.run_time);
    if (!p.ok) continue;
    const v = library.get(numericId(l.vimeo_ref!));
    if (!v) { cUnreachable.push({ title: l.title, id: numericId(l.vimeo_ref!) }); continue; }
    if (Math.abs(v.duration - p.seconds) <= AGREE_TOLERANCE_SECONDS) agree += 1;
    else disagree.push({ title: l.title, xls: p.seconds, api: v.duration, diff: v.duration - p.seconds });
  }
  const compared = agree + disagree.length;
  console.log(`  compared ${compared} (${cUnreachable.length} not in the library)`);
  console.log(`  ⚠ AGREE within ${AGREE_TOLERANCE_SECONDS}s: ${agree}/${compared}` +
    (compared ? ` (${((agree / compared) * 100).toFixed(1)}%)` : ""));
  console.log(`  DISAGREE: ${disagree.length}`);
  disagree.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  /* ⚠ EVERY disagreement over 10s, not just the worst ten. */
  const material = disagree.filter((d) => Math.abs(d.diff) > 10);
  console.log(`  ⚠ EVERY disagreement over 10s (${material.length}):`);
  material.forEach((d) =>
    console.log(`      xls=${String(d.xls).padStart(5)}s  api=${String(d.api).padStart(5)}s  Δ${d.diff > 0 ? "+" : ""}${d.diff}s   ${d.title.slice(0, 54)}`)
  );
  const minor = disagree.filter((d) => Math.abs(d.diff) <= 10);
  if (minor.length) {
    console.log(`  within 10s but outside tolerance (${minor.length}):`);
    minor.forEach((d) => console.log(`      xls=${d.xls}s api=${d.api}s Δ${d.diff > 0 ? "+" : ""}${d.diff}s  ${d.title.slice(0, 48)}`));
  }

  const ratio = compared ? agree / compared : 0;
  const proven = compared >= 20 && ratio >= 0.95;
  console.log(`\n  RULE ${proven ? "PROVEN" : "NOT PROVEN"} (${(ratio * 100).toFixed(1)}% agreement over ${compared} rows)`);

  if (!proven && !FORCE_B) {
    console.log("\n⚠⚠ STOPPING BEFORE PASS B. The 60× rule did not hold against real durations.");
    console.log("   ⚠ AND THAT WOULD MEAN SOME OF THE XLS DURATIONS ALREADY WRITTEN ARE WRONG.");
    console.log("   Nothing further was written. That is Scott's call, not this script's.");
    return;
  }
  if (!proven && FORCE_B) console.log("\n⚠ --force-b: running Pass B despite Pass C. This is on the operator.");

  /*
    ── ⚠⚠ WS-4 · THE MEETING RECORDINGS — REPORT ONLY, NOTHING CONVERTED ──────

    Every value the parser refused is a meeting recording: "CLIENT MTG —
    Discussing … Current State", "End of the Learning Path", the daily stand-up.
    ⚠ THAT SUGGESTS A DIFFERENT CATEGORY: long-form recordings whose cell may hold
    a TRUE duration rather than a 60×-shifted one. A two-hour client meeting is
    entirely plausible as literally two hours.
    ⚠ NOTHING IS CONVERTED AND THE PARSER IS NOT CHANGED. The API's true length is
    printed beside the XLS string so Scott can see whether the pattern holds.
  */
  console.log("\n═══ WS-4 · MEETING RECORDINGS — XLS string beside the API's true length ═══");
  const meetingish = lessons.filter((l) => {
    const raw = (l.run_time ?? "").trim();
    if (!raw) return false;
    const p = parseRunTime(l.run_time);
    /* refused rows, plus every `N days` row whether it converted or not */
    return !p.ok || /^\d+\s+days?,/.test(raw);
  });
  for (const l of meetingish) {
    const p = parseRunTime(l.run_time);
    const v = l.vimeo_ref ? library.get(numericId(l.vimeo_ref)) : undefined;
    const shifted = p.ok ? `${p.seconds}s` : `refused (${p.reason})`;
    /* ⚠ WHAT THE CELL WOULD MEAN IF READ LITERALLY — shown for comparison only. */
    const raw = (l.run_time ?? "").trim();
    const litM = /^(\d+):(\d{2}):(\d{2})$/.exec(raw);
    const literal = litM ? Number(litM[1]) * 3600 + Number(litM[2]) * 60 + Number(litM[3]) : null;
    console.log(
      `      xls="${raw}"`.padEnd(34) +
        ` 60×-shifted=${shifted}`.padEnd(30) +
        (literal !== null ? ` literal=${literal}s` : " literal=n/a").padEnd(18) +
        ` api=${v ? `${v.duration}s` : l.vimeo_ref ? "not in library" : "no video"}`.padEnd(22) +
        ` ${l.title.slice(0, 44)}`
    );
  }

  /* ── PASS B — Vimeo, for playable lessons Pass A did not fill ────────────── */
  console.log("\n═══ PASS B · fill from Vimeo ═══");
  const todo = await prisma.lesson.findMany({
    where: { vimeo_ref: { not: null }, duration_seconds: null },
    select: { id: true, title: true, vimeo_ref: true },
    orderBy: { title: "asc" },
  });
  console.log(`  ${todo.length} playable lessons still without a duration`);
  let bFilled = 0;
  const bFail: { title: string; reason: string }[] = [];
  const bRejected: { title: string; seconds: number }[] = [];
  for (const l of todo) {
    /* ⚠ FROM THE MAP — no per-row network call at all now. */
    const hit = library.get(numericId(l.vimeo_ref!));
    /*
      ⚠⚠ A ZERO-LENGTH VIDEO IS NOT A DURATION. Measured: the library really does
      contain one — "The How to Use Oracle Cloud's Terms Library" reports
      `duration: 0`, which is a placeholder or a failed upload, not a 0-second
      lesson. The first run of this pass guarded only the CEILING and wrote that
      0 straight into the column; `check:duration` GUARD 2 caught it.
      ⚠ THE FIX IS HERE, NOT IN THE ASSERTION.
    */
    const v =
      hit && hit.duration > 0
        ? ({ ok: true, seconds: hit.duration } as const)
        : hit
          ? ({ ok: false, reason: "library reports duration 0 — placeholder or failed upload" } as const)
          : ({ ok: false, reason: "not in the owner's library" } as const);
    if (!v.ok) { bFail.push({ title: l.title, reason: v.reason }); }
    else if (v.seconds > DURATION_CEILING_SECONDS) {
      /* ⚠ THE CEILING APPLIES TO VIMEO TOO. A real 3-hour video is still not a
         lesson, and letting it through here would defeat the harness. */
      bRejected.push({ title: l.title, seconds: v.seconds });
    } else {
      if (!DRY) {
        await prisma.lesson.update({
          where: { id: l.id },
          data: { duration_seconds: v.seconds, duration_source: "vimeo" },
        });
      }
      bFilled += 1;
    }
  }
  console.log(`  filled from Vimeo: ${bFilled}`);
  console.log(`  over the ceiling, left null: ${bRejected.length}`);
  bRejected.forEach((r) => console.log(`      ${r.seconds}s  ${r.title.slice(0, 58)}`));
  console.log(`  ⚠ NOT FILLED (${bFail.length}) — reported, never guessed:`);
  bFail.forEach((f) => console.log(`      ${f.reason}  ${f.title.slice(0, 58)}`));

  /* ── coverage ────────────────────────────────────────────────────────────── */
  console.log("\n═══ COVERAGE ═══");
  const total = await prisma.lesson.count();
  const withDur = await prisma.lesson.count({ where: { duration_seconds: { not: null } } });
  const xls = await prisma.lesson.count({ where: { duration_source: "xls" } });
  const vim = await prisma.lesson.count({ where: { duration_source: "vimeo" } });
  console.log(`  ${withDur} of ${total} lessons have a duration — xls ${xls}, vimeo ${vim}`);
  const orphanNum = await prisma.lesson.count({ where: { duration_seconds: { not: null }, duration_source: null } });
  const orphanSrc = await prisma.lesson.count({ where: { duration_seconds: null, duration_source: { not: null } } });
  console.log(`  ⚠ integrity — number with no source: ${orphanNum}, source with no number: ${orphanSrc} (both must be 0)`);

  /* ⚠ THE TESTER'S PATH. This is the number that matters tomorrow. */
  const inv = await prisma.learningPath.findFirst({
    where: { title: "Inventory Management" },
    select: { courses: { select: { sections: { select: { lessons: { select: { vimeo_ref: true, duration_seconds: true } } } } } } },
  });
  const invLessons = inv?.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)) ?? [];
  const invPlayable = invLessons.filter((l) => l.vimeo_ref);
  console.log(`  ⚠ Inventory Management (the tester's path): ${invPlayable.filter((l) => l.duration_seconds).length} of ${invPlayable.length} playable lessons have a duration`);
}

main().then(() => prisma.$disconnect());
