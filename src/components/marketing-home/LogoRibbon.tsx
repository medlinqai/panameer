/**
 * The slim magenta client ribbon (brief §4).
 *
 * ⚠ THE NAMES ARE PLACEHOLDERS — Meridian, Northpeak, Vantage, Cedarline,
 * Halcyon, Brightpath are invented, and the brief says to keep them as-is until
 * Scott swaps in real logos. They are rendered as wordmarks with generic
 * glyphs rather than as logo images precisely so nobody mistakes them for
 * customers we have.
 */
export function LogoRibbon() {
  return (
    <>
      {/* LOGO STRIP */}
      <div className="logos">
        <div className="wrap">
          <div className="row">
            <span className="co"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 15a5 5 0 1 1 5-5 5 5 0 0 1-5 5Z" /></svg>Meridian</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 15l6-7 4 5 3-4 7 9H2z" /></svg>Northpeak</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l9 6-9 14L3 8z" /></svg>Vantage</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z" /></svg>Cedarline</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="6" /></svg>Halcyon</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l3.2 7.8L23 12l-7.8 3.2L12 23l-3.2-7.8L1 12l7.8-3.2z" /></svg>Brightpath</span>
          </div>
        </div>
      </div>
    </>
  );
}
