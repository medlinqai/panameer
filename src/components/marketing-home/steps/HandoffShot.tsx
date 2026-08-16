/**
 * STEP 3 GRAPHIC — the handoff. An email carrying the link, dashboard behind.
 *
 * The composition IS the message: the dashboard is already built and sitting
 * there, and the email is just the key. That is why the dashboard sits behind
 * rather than after — "we build it, then we mail you" drawn as two sequential
 * cards would read as a wait.
 *
 * ── THE LINK TEXT IS THE REAL ONE ────────────────────────────────────────────
 *
 * `/assess/claim/<token>` is what `api/assessment/route.ts` actually mails to a
 * logged-out submitter, and clicking it signs them in and lands them on
 * `/assess/r/<token>` — verified end to end for §6 of this brief. The token is
 * a visibly fake uuid so nobody tries it.
 *
 * Inert by construction: the "link" is a <span>, not an <a>. It is inside a
 * decorative card, and `check:ui` §12 forbids interactive nesting anywhere on
 * this page — but more simply, a marketing graphic must not offer a click that
 * goes nowhere.
 */
export function HandoffShot() {
  return (
    <div className="hos">
      {/* ---- behind: the dashboard, already built ---------------------- */}
      <div className="hos-back" aria-hidden>
        <div className="hos-win">
          <span className="hos-dot r" />
          <span className="hos-dot y" />
          <span className="hos-dot g" />
        </div>
        <div className="hos-body">
          <div className="hos-tiles">
            <div className="hos-tile">
              <span className="hos-tl">Yr-1 Funding</span>
              <span className="hos-tv">$0&ndash;18K</span>
            </div>
            <div className="hos-tile">
              <span className="hos-tl">Opportunity</span>
              <span className="hos-tv">$29&ndash;47K</span>
            </div>
            <div className="hos-tile">
              <span className="hos-tl">Investment</span>
              <span className="hos-tv">$16&ndash;20K</span>
            </div>
          </div>
          <div className="hos-rows">
            <span className="hos-row w1" />
            <span className="hos-row w2" />
            <span className="hos-row w3" />
            <span className="hos-row w2" />
          </div>
        </div>
      </div>

      {/* ---- in front: the email --------------------------------------- */}
      <div className="hos-mail">
        <div className="hos-mhead">
          <span className="hos-avatar" aria-hidden>
            P
          </span>
          <span className="hos-mfrom">
            <b>Panameer</b>
            <span>reports@panameer.com</span>
          </span>
        </div>
        <div className="hos-subj">Your P2P AI Maturity report is ready</div>
        <p className="hos-mbody">
          We scored all eight capability domains and ranked the opportunities by
          the dollars running through each one. Your dashboard is live:
        </p>
        <span className="hos-link">
          panameer.com/assess/claim/8f2c&hellip;
        </span>
        <p className="hos-note">
          The link signs you in. No password to set, nothing to install.
        </p>
      </div>
    </div>
  );
}
