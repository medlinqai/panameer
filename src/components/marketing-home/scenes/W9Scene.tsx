import { W9_CHECKS, W9_FIELDS } from "@/lib/marketing-scenes";

/**
 * SCENE 3 — W-9 validation.
 *
 * ⚠ THE AGENT DOES NOT AUTO-APPROVE, and that is the argument.
 *
 * Six checks pass, one warns, and the status band reads "6 / 7 — Needs review"
 * with "a buyer decides, the agent does not." An agent that cleared a name
 * mismatch on its own is precisely what a procurement lead will not trust, so
 * the honest version is also the more persuasive one. Do not "improve" this to
 * 7/7.
 */
export function W9Scene() {
  const passed = W9_CHECKS.filter((c) => c.ok).length;
  return (
    <div className="scene w9">
      <div className="sh">
        <div className="lg"><i>P</i>Panameer</div>
        <span className="t">Supplier registration · Document validation</span>
        <span className="sh-sp" />
        <span className="pill">AGENT RUN · 1.8s</span>
      </div>
      <div className="w9body">
        <div className="docpane">
          <div className="doc">
            <h5>Form W-9</h5>
            <div className="frm">
              Request for Taxpayer Identification Number and Certification · Rev. March 2024
            </div>
            {W9_FIELDS.map(([k, v]) => (
              <div className="fld" key={k}><span>{k}</span><b>{v}</b></div>
            ))}
            {/* The flagged field — line 2 — highlighted in magenta on the document itself. */}
            <div className="hl" />
          </div>
          <div className="docmeta">W9_Cedarline_2026.pdf · 412 KB · uploaded 11 Aug 2026 by M. Reyes</div>
        </div>

        <div className="w9chk">
          <h4>Cedarline Industrial LLC</h4>
          <div className="csub">Registration 8841 · submitted 11 Aug 2026 · {W9_CHECKS.length} checks run</div>
          <div className="status">
            <div className="n">{passed} / {W9_CHECKS.length}</div>
            <div className="x">
              <b>Needs review.</b> Six checks passed. One field disagrees with what the supplier
              typed during registration — a buyer decides, the agent does not.
            </div>
          </div>
          <div className="res">
            {W9_CHECKS.map((c) => (
              <div className="r" key={c.title}>
                <span className={"ic " + (c.ok ? "ok" : "wn")} aria-hidden>{c.ok ? "✓" : "!"}</span>
                <div>
                  <b>{c.title}</b>
                  <span className="d">{c.detail}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="btns">
            <span className="mbtn p">Approve and Create Supplier</span>
            <span className="mbtn">Request a Correction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
