/**
 * ── ⚠⚠ THE DEPLOY-TIME LINE (`P2-J3-E522`) ─────────────────────────────────
 *
 * ⚠ SCOTT, 2026-09-17: *"The log line is free and it puts the answer in the
 * build output where I see it without signing in. Tonight cost hours because
 * the only way to know was inference."*
 *
 * ⚠ It runs BEFORE `next build`, in the same environment the deployment will
 * run in, so the domain it prints is the one that deployment will send as.
 *
 * ⚠⚠ IT LOADS `.env.local` VIA `-r dotenv/config`, AND THAT IS NOT OPTIONAL.
 * `next build` loads `.env.local` itself, but this script runs BEFORE Next and
 * would otherwise see no `EMAIL_FROM` and report SANDBOX on a machine that is
 * sending for real — ⚠ MEASURED: it did exactly that on the first run. A line
 * that lies is worse than no line, and is the defect this whole surface exists
 * to remove. ⚠ On Vercel there is no `.env.local` and the real environment
 * variables win, so the same command is correct in both places.
 *
 * ⚠⚠ IT CAN NEVER FAIL A BUILD. A line in a log is worth nothing next to a
 * deploy, so every failure is swallowed and reported as a line of its own.
 * ⚠ Exit code is ALWAYS 0.
 */
import { sendingState, sendingStateLine } from "@/lib/email/sending-state";

try {
  const s = sendingState();
  const line = sendingStateLine(s);
  console.log("");
  console.log("  ────────────────────────────────────────────────────────────");
  console.log(`  ${line}`);
  if (s.alarming) {
    console.log("  ⚠⚠ A PREVIEW THAT SENDS REAL MAIL SHARES THE PRODUCTION DATABASE.");
  }
  if (s.live && !s.alarming) {
    console.log("  ⚠ Real addresses will receive mail from this deployment.");
  }
  console.log("  ────────────────────────────────────────────────────────────");
  console.log("");
} catch (e) {
  console.log(`  [mail] could not determine sending state: ${(e as Error).message}`);
}
process.exit(0);
