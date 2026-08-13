/**
 * THE 5-STEP SEGMENTED METHODOLOGY RING (brief §5).
 *
 * The real delivery methodology — Define / Design / Develop / Decide / Deploy —
 * with each step's deliverables line and description VERBATIM from the mockup.
 *
 * ── WHY THE SVG IS INLINE AND HAND-PLACED ────────────────────────────────────
 *
 * The five wedges, their arrow tips and the segment numbers are absolute path
 * data computed for a 660x660 viewBox; the five labels are positioned as
 * percentages around it. That pairing is the design. Regenerating the geometry
 * from a loop would be a different ring, and the brief asks for this one.
 *
 * ── LABELS MUST NOT OVERLAP THE RING ─────────────────────────────────────────
 *
 * `.wnode` positions come straight from the mockup and are what keep the five
 * labels clear of the wedges at desktop. Below ~820px `home.css` stops
 * absolutely positioning them and stacks the five into a vertical list, which
 * is the mockup's own fallback — the ring cannot hold five labels on a phone.
 */
export function MethodologyRing() {
  return (
    <>
      {/* METHODOLOGY (5-STEP SEGMENTED RING) */}
      <section className="block" style={{ paddingTop: '52px', paddingBottom: '60px' }}>
        <div className="wrap">
          <div className="center">
            <div className="eyebrow">Our Method</div>
            <h2>Optimize by Methodology</h2>
            <p>One method, run continuously — because good businesses never stand still.</p>
          </div>
          <div className="wheel">
            <svg className="wheel-svg" viewBox="0 0 660 660" preserveAspectRatio="xMidYMid meet"><path d="M 214.54 152.20 A 212.0 212.0 0 0 1 445.46 152.20 L 445.13 190.34 L 411.70 204.20 A 150.0 150.0 0 0 0 248.30 204.20 Z" fill="#f4cbf3" /><path d="M 463.42 165.25 A 212.0 212.0 0 0 1 534.78 384.87 L 498.41 396.34 L 474.89 368.82 A 150.0 150.0 0 0 0 424.40 213.43 Z" fill="#e79fe6" /><path d="M 527.92 405.97 A 212.0 212.0 0 0 1 341.10 541.71 L 318.95 510.66 L 337.85 479.79 A 150.0 150.0 0 0 0 470.04 383.76 Z" fill="#dc72da" /><path d="M 318.90 541.71 A 212.0 212.0 0 0 1 132.08 405.97 L 154.77 375.32 L 189.96 383.76 A 150.0 150.0 0 0 0 322.15 479.79 Z" fill="#d72cd6" /><path d="M 125.22 384.87 A 212.0 212.0 0 0 1 196.58 165.25 L 232.75 177.35 L 235.60 213.43 A 150.0 150.0 0 0 0 185.11 368.82 Z" fill="#ad22ab" /><text x="330.0" y="149.0" textAnchor="middle" dominantBaseline="central" fontFamily="Comfortaa" fontWeight="700" fontSize="30" fill="#7a1478">1</text><text x="502.1" y="274.1" textAnchor="middle" dominantBaseline="central" fontFamily="Comfortaa" fontWeight="700" fontSize="30" fill="#7a1478">2</text><text x="436.4" y="476.4" textAnchor="middle" dominantBaseline="central" fontFamily="Comfortaa" fontWeight="700" fontSize="30" fill="#ffffff">3</text><text x="223.6" y="476.4" textAnchor="middle" dominantBaseline="central" fontFamily="Comfortaa" fontWeight="700" fontSize="30" fill="#ffffff">4</text><text x="157.9" y="274.1" textAnchor="middle" dominantBaseline="central" fontFamily="Comfortaa" fontWeight="700" fontSize="30" fill="#ffffff">5</text></svg>
            <div className="hub">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5M3 21v-5h5" /></svg>
              <b>Continuous<br />Transformation</b>
              <span>Improve. Repeat.</span>
            </div>
            <div className="wnode" style={{ left: '50.0%', top: '13.0%' }}><h3>Define</h3><div className="wsub">ASSESSMENT / REQUIREMENTS / ROADMAP / TALENT</div><p>Take our assessment, see your scope in our dashboard, select the right talent.</p></div>
            <div className="wnode" style={{ left: '85.9%', top: '38.3%' }}><h3>Design</h3><div className="wsub">ERD / DESIGN DOCUMENT / PROCESS FLOWS</div><p>Design the solution, map back to requirements, approve the design.</p></div>
            <div className="wnode" style={{ left: '72.2%', top: '80.6%' }}><h3>Develop</h3><div className="wsub">ARCHITECTURE / APPLICATIONS / AGENTS</div><p>Create the architecture, configure the applications &amp; integrations, convert the data, enable the agents.</p></div>
            <div className="wnode" style={{ left: '27.8%', top: '80.6%' }}><h3>Decide</h3><div className="wsub">SYSTEM TEST / USER TEST / TRAIN &amp; EXPLAIN</div><p>Test the entire system from end-to-end, ensure system works for the users, train internal and external users.</p></div>
            <div className="wnode" style={{ left: '14.1%', top: '38.3%' }}><h3>Deploy</h3><div className="wsub">CONVERT / INTEGRATE / GO-LIVE / SMOKE TEST</div><p>Convert required data, integrate with required systems, go-live and ensure working.</p></div>
          </div>
        </div>
      </section>
    </>
  );
}
