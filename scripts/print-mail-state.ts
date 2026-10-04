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
