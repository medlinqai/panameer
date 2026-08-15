import { WR_EXPERTS, WR_SCOPE, WR_SKILLS, WR_TERMS } from "@/lib/marketing-scenes";

/**
 * SCENE 4 — a work request, and the experts who can do it.
 *
 * ⚠ NOT A PUNCH-OUT FLOW. An earlier draft diagrammed an Oracle punch-out;
 * Scott redirected it here. The point being made is the one the ERP cannot
 * make: the requisition raised the need, and the moment the work request exists
 * the people who can do it are already on screen with rate, availability and
 * validation pulled from their profiles.
 */
export function WorkRequestScene() {
  return (
    <div className="scene wr">
      <div className="sh">
        <div className="lg"><i>P</i>Panameer</div>
        <span className="t">Work request created — experts matched and ready to invite</span>
        <span className="sh-sp" />
        <span className="pill">4 MATCHES · 2.1s</span>
      </div>
      <div className="wrbody">
        <div className="wrleft">
          <span className="wrbadge">✓ WORK REQUEST CREATED</span>
          <h4>Procurement Contracts configuration — Oracle Cloud</h4>
          <div className="wrmeta">WR-2214 · raised from requisition REQ-104903 · Clinical Operations</div>

          <div className="wrsec">Scope</div>
          <ul>{WR_SCOPE.map((l) => <li key={l}>{l}</li>)}</ul>

          <div className="wrsec">Skills</div>
          <div className="chips">{WR_SKILLS.map((s) => <span className="chip2" key={s}>{s}</span>)}</div>

          <div className="wrsec">Terms</div>
          {WR_TERMS.map(([k, v]) => (
            <div className="wrkv" key={k}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>

        <div className="wrright">
          <h4>Four experts match this work</h4>
          <div className="rsub">
            Ranked on the skills you just entered — not on who paid for placement. Invite now;
            they reply in the work request.
          </div>

          {WR_EXPERTS.map((e) => (
            <div className={"prov" + (e.top ? " top" : "")} key={e.name}>
              <span className="av" style={{ background: e.avatar }} aria-hidden>{e.initials}</span>
              <div className="pv">
                <div className="nm">
                  {e.name}
                  {e.validated && <span className="vb">VALIDATED</span>}
                </div>
                <div className="ttl">{e.title}</div>
                <div className="tg">{e.tags.map((t) => <span key={t}>{t}</span>)}</div>
              </div>
              <div className="rt2">
                <div className="r">{e.rate}</div>
                <div className="s">/ hr</div>
                <span className={"inv" + (e.top ? "" : " g")}>Invite</span>
              </div>
            </div>
          ))}

          <div className="wrfoot">
            <b>This is the part the ERP does not do.</b> The requisition raised the need; the
            moment the work request exists, the people who can do it are already in front of you —
            rate, availability and validation pulled from their profile, nothing re-keyed. Invite
            three, compare replies, contract and settle without leaving the record.
          </div>
        </div>
      </div>
    </div>
  );
}
