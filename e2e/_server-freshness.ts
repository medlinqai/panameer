import { execFileSync } from "node:child_process";
import { statSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ A GATE MUST NEVER REUSE A SERVER OLDER THAN ITS OWN ARTEFACTS ──────
 *
 * ⚠ SCOTT, 2026-09-21, ruling on the `P0-E595` WS-B gate: *"Gates must never
 * reuse a server older than the current Prisma client or build."*
 *
 * ── WHAT HAPPENED, MEASURED ────────────────────────────────────────────────
 *
 * ⚠⚠ A `next-server` HAD BEEN RUNNING ON PORT 3100 SINCE 20:58 THE PREVIOUS
 * NIGHT — started BEFORE `E595` dropped `provider_profiles.headline`, before
 * `npx prisma generate`, and before the reseed. ⚠⚠⚠ EVERY PLAYWRIGHT CONFIG IN
 * THIS REPO CARRIES `reuseExistingServer: true`, so all six app-shell suites
 * silently attached to it and got **HTTP 500 from a stale Prisma client** on
 * `/providers/[id]`.
 * ⚠ TWO OF THE THREE RED GATES AT THAT RUN WERE THIS, NOT THE CODE. The failure
 * was attributed to the branch under test, which is the expensive shape: a gate
 * that fails for a reason it does not name costs more than one that does not run.
 *
 * ── ⚠⚠ WHY THE PRISMA CLIENT IS THE RIGHT ARTEFACT TO COMPARE AGAINST ──────
 *
 * ⚠⚠⚠ `next dev` HOT-RELOADS `src/`, SO SOURCE MTIME IS NOT A STALENESS SIGNAL
 * — a long-running dev server is perfectly current for application code, and
 * refusing on it would make this guard cry wolf every time anybody saved a file.
 * ⚠ **THE GENERATED PRISMA CLIENT IS DIFFERENT: it is a `node_modules` require,
 * resolved and cached in the running process, and `prisma generate` REPLACES IT
 * ON DISK WITHOUT THE SERVER EVER NOTICING.** That is precisely the failure
 * above, and it is the one artefact a running server cannot pick up.
 * ⚠ `.next/BUILD_ID` is compared too, for a `npm run start` server: a production
 * server serves a frozen build and a rebuild does not reach it either.
 *
 * ── ⚠ WHY IT REFUSES RATHER THAN RESTARTING ────────────────────────────────
 *
 * ⚠⚠ KILLING SOMETHING THE DEVELOPER STARTED IS WORSE THAN THE CONFUSION IT
 * WOULD SAVE — the rule `_dev-server-guard.ts` already states and this keeps.
 * The message names the process, both timestamps and the one command that fixes
 * it. ⚠ It is a `globalSetup`, so it ABORTS the run: a failing test is one red
 * line among many and the rest still print, which reads as "the branch is
 * broken" rather than "you are pointed at the wrong server."
 */

/** The server's start time, or `null` when nothing is listening / we cannot tell. */
function listeningSince(port: number): { pid: number; started: Date } | null {
  let pid: number;
  try {
    /*
      ⚠ `lsof` IS macOS-AND-LINUX AND THIS REPO IS mac-only (`darwin`). A
      failure here is treated as "cannot tell", never as "stale" — a guard that
      blocks the suite on its own inability to measure is worse than no guard.

      ── ⚠⚠⚠ `-sTCP:LISTEN`, AND LEAVING IT OUT MADE THIS GUARD CRY WOLF ─────

      ⚠ `lsof -ti tcp:3100` RETURNS EVERY SOCKET ON THE PORT, not just the
      server: an open browser tab holding an ESTABLISHED connection is in that
      list too. ⚠⚠ MEASURED 2026-09-21, and it blocked a real gate run: the
      guard picked up a **Google Chrome Helper** (pid 48747, started the
      previous day), compared its age against a build from thirty seconds
      earlier, and refused the suite while the only actual server was the one
      Playwright was about to start.
      ⚠⚠⚠ THE FAILURE MODE OF A GUARD IS THE THING TO GET RIGHT. This one
      aborts a whole run, so a false positive costs more than the confusion it
      prevents — and it told the developer to `kill` their own browser.
    */
    const out = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], {
      encoding: "utf8",
    }).trim();
    const first = out.split(/\s+/).filter(Boolean)[0];
    if (!first) return null;
    pid = Number(first);
    if (!Number.isFinite(pid)) return null;
  } catch {
    return null;
  }
  try {
    const lstart = execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf8",
    }).trim();
    const started = new Date(lstart);
    if (Number.isNaN(started.getTime())) return null;
    return { pid, started };
  } catch {
    return null;
  }
}

/** Newest mtime under a path, one level deep — enough for a generated client. */
function newestMtime(path: string): Date | null {
  if (!existsSync(path)) return null;
  try {
    const st = statSync(path);
    if (!st.isDirectory()) return st.mtime;
    let newest = st.mtime;
    for (const name of require("node:fs").readdirSync(path) as string[]) {
      try {
        const m = statSync(join(path, name)).mtime;
        if (m > newest) newest = m;
      } catch {
        /* a file that vanished mid-scan is not a staleness signal */
      }
    }
    return newest;
  } catch {
    return null;
  }
}

export async function assertServerFresh(port = 3100): Promise<void> {
  const live = listeningSince(port);
  /* ⚠ Nothing listening is Playwright's own `webServer` problem — it is about to
     start a fresh one, which is exactly what we want. Say nothing. */
  if (!live) return;

  const root = process.cwd();
  const artefacts: { label: string; at: Date; fix: string }[] = [];

  const prismaClient = newestMtime(join(root, "node_modules", ".prisma", "client"));
  if (prismaClient) {
    artefacts.push({
      label: "the generated Prisma client (node_modules/.prisma/client)",
      at: prismaClient,
      fix: "npx prisma generate",
    });
  }
  /*
    ── ⚠⚠⚠ `.next/BUILD_ID` IS NOT COMPARED, AND THAT IS A CORRECTION ───────

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const buildId = newestMtime(join(root, ".next", "BUILD_ID"));
    //   if (buildId) artefacts.push({ label: "the Next build (.next/BUILD_ID)", … });

    ⚠⚠ EVERY SUITE BEHIND THIS GUARD RUNS `npm run dev`, AND A DEV SERVER DOES
    NOT SERVE `.next/BUILD_ID` — that file is the PRODUCTION build's output.
    Comparing the two is a category error, and it has a cost: running
    `npm run build` (an ordinary thing to do before a gate sweep) wrote a newer
    BUILD_ID and the guard then refused a dev server that was perfectly current.
    ⚠ MEASURED 2026-09-21 — server 20:49:02, build 20:50:02, suite blocked.

    ⚠⚠⚠ THE PRISMA CLIENT CHECK IS THE ONE THAT MATTERS AND IT STAYS. That is
    the artefact a RUNNING server genuinely cannot pick up — a node_modules
    require resolved once and cached in the process — and it is the one that
    produced the 500s this guard was written for.
  */

  const stale = artefacts.filter((a) => a.at > live.started);
  if (stale.length === 0) return;

  const lines = [
    "",
    "⚠⚠⚠ THE SERVER ON PORT " + port + " IS OLDER THAN THIS CHECKOUT'S ARTEFACTS.",
    "",
    `  A process is already listening (pid ${live.pid}), started ${live.started.toISOString()},`,
    "  and every Playwright config here sets `reuseExistingServer: true` — so this",
    "  suite would attach to it instead of starting a current one.",
    "",
    "  NEWER THAN THAT SERVER:",
    ...stale.map((a) => `    · ${a.label}\n        written ${a.at.toISOString()}`),
    "",
    "  ⚠ A RUNNING SERVER CANNOT PICK THESE UP. `next dev` hot-reloads `src/`, but",
    "    the Prisma client is a node_modules require cached in the process, and a",
    "    production server serves a frozen build. The result is HTTP 500s from a",
    "    stale client, reported against whatever branch happens to be under test.",
    "",
    "  FIX — stop that server and let the harness start its own:",
    `      kill ${live.pid}`,
    "",
    "  ⚠ This guard does NOT kill it for you. Killing something you started is",
    "    worse than the confusion it would save.",
    "",
  ];
  throw new Error(lines.join("\n"));
}
