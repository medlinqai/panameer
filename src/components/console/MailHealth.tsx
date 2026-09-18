import { sendingState } from "@/lib/email/sending-state";

/**
 * ── ⚠⚠ MAIL HEALTH — PANAMEER ADMIN ONLY (`P2-J3-E522`) ────────────────────
 *
 * ⚠⚠ THE ANSWER TO A QUESTION THAT COST HOURS. On 2026-09-17 the only way to
 * learn whether production could send real mail was to read Resend's log and
 * infer the sending domain from a subject line. ⚠ Scott: *"That is the thing
 * that would have told me on 09-12 instead of 09-18."*
 *
 * ⚠ IT SITS ON /admin AND NOWHERE ELSE — the layout gates on `canAdminister`
 * and the edge proxy covers `/admin/:path*`, exactly like `ParserHealth`.
 *
 * ⚠⚠⚠ DOMAIN ONLY. NEVER the local part, never the whole `EMAIL_FROM` — it is a
 * Vercel SECRET and this is a screen people screenshot.
 *
 * ⚠ IT IS LOUD WHEN WRONG, ON PURPOSE (Scott's third ruling): RED when sending
 * is LIVE **and** the environment is PREVIEW. ⚠⚠ Previews share the ONE
 * database with production, so a preview branch can mail real members from code
 * nobody reviewed. That combination is nobody's intention and must not read as
 * a normal green line.
 */
export function MailHealth() {
  const s = sendingState();

  const tone = s.alarming
    ? "border-red-300 bg-red-50"
    : s.live
      ? "border-amber-300 bg-amber-50"
      : "border-line bg-bg-soft";

  const headline = s.captured
    ? "Captured — no mail leaves this environment"
    : s.sandbox
      ? "Sandbox — only the Resend account owner can receive"
      : `Real sending: LIVE from ${s.environment}`;

  return (
    <section className={`rounded-brand border p-5 ${tone}`}>
      <h2 className="font-display text-[16px] font-bold">Mail</h2>
      <p className="mt-2 text-[15px] font-bold">{headline}</p>

      {!s.captured && !s.sandbox && (
        <p className="mt-1 text-[14px] text-ink-2">
          Sending as{" "}
          {/* ⚠ DOMAIN ONLY — see the header. */}
          <span className="font-bold text-ink">{s.domain ?? "an unreadable address"}</span>
        </p>
      )}

      {s.alarming && (
        <p className="mt-3 rounded-[10px] bg-red-100 p-3 text-[13.5px] font-bold leading-relaxed text-red-900">
          ⚠ This is a PREVIEW and it is sending real mail. Previews share the
          production database, so this deployment can email real members.
        </p>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        {/* ⚠ SAYS WHERE THE ANSWER COMES FROM. A health card nobody trusts is a
            health card nobody reads — and the check that USED to answer this
            could not see the environment it was asked about. */}
        Read from this environment at request time — <code>EMAIL_FROM</code> and{" "}
        <code>MAIL_CAPTURE</code> as they actually are here, not as a build-time
        check guesses them.
      </p>
    </section>
  );
}
