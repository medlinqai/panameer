/**
 * The slim magenta client ribbon (brief §4).
 *
 * ── ⚠⚠ FIVE REAL CLIENTS (`P1-J0-E357`) ────────────────────────────────────
 *
 * Scott, 2026-08-28: *"drop staterp and do 5."*
 * ⚠ THE ROW PREVIOUSLY HELD SIX INVENTED PLACEHOLDER COMPANIES, rendered as wordmarks
 * with generic filled glyphs precisely so nobody would mistake them for customers we
 * had. ALL SIX ARE GONE and their glyphs went with them; nothing else imported either.
 * ⚠ THEIR NAMES ARE DELIBERATELY NOT REPEATED HERE — `E357` gate 2 requires that no
 * placeholder name remain anywhere in this file, and a name in a comment is still a
 * name a reader can lift. The old header and all six are recoverable in full from
 * `f8fd287`, which is the record.
 * ⚠ `STRATERP` IS DELIBERATELY NOT HERE. Scott dropped it in the same instruction —
 * this row is CLIENT companies and StratERP is his own. ⚠ `GetTheTalentShot.tsx`
 * still names it in a product card; different surface, untouched.
 *
 * ⚠ NAMES EXACTLY AS HE WROTE THEM: `medlinq.ai` lowercase WITH the `.ai` (he chose
 * it from three options), and `Palencia MedSpa` with a capital S in MedSpa.
 *
 * ── ⚠⚠ ALL FIVE GLYPHS ARE STROKED, NOT FILLED, AND THAT IS FRAGILE ──────────
 *
 * The row used to be solid shapes; every one of these is a line drawing.
 * ⚠ `strokeWidth="1.75"`, NOT `1.5`. Scott approved this weight rendered at 26px and
 * had already rejected 1.5 — *"hard to see it....maybe a little bolder?"*.
 * ⚠⚠ THE GLYPH BOX SHIPPED AT 21px, NOT THE BRIEF'S 22px — Scott's number. At 22px
 * the brief's justification held exactly (`1.5 x 26/22 = 1.77` ~ 1.75). AT 21px THE
 * EQUIVALENT IS `1.5 x 26/21 = 1.86`, so 1.75 renders ABOUT 6% LIGHTER than the 26px
 * he signed off. The brief forbids changing 1.75 so it was left alone and REPORTED;
 * 1.86 is the number if he wants that appearance back. Do not "restore" 1.5.
 * ⚠⚠ JSX camelCase — `strokeWidth`, `strokeLinecap`, `strokeLinejoin`. THE LOWERCASE
 * HTML SPELLINGS ARE SILENTLY IGNORED BY REACT and the glyph renders hairline-thin.
 * ⚠ A malformed `d`, a lowercase attribute, or `fill="none"` with no stroke renders
 * NOTHING — no console error, no build failure. `E357` verified all five by
 * screenshotting the row zoomed and looking at the shapes, not by reading the markup.
 *
 * ⚠ `medlinq.ai` IS HIS MARK, pixel-sampled: two rings, r 4.1 at cx 4.9 / 19.1, with
 * the ECG traced through its real peak and trough. ⚠ THE OUTER EDGES LAND 0.05 UNITS
 * INSIDE THE viewBox and SVG clips at the viewport edge — DO NOT increase `r` or the
 * centre spread. A hairline clip on both rings is a rendering artefact, not a bug.
 * ⚠ THE TWO TEETH ARE DELIBERATELY THE SAME OUTLINE — the periodontics one carries
 * three dashes across it, which is how Scott's icon sheet distinguishes them. NOT a
 * copy-paste error.
 *
 * ⚠ THE ROW IS SIZED FOR THESE NAMES, AND TIGHTLY. Practice names are far longer than
 * the one-word placeholders, so `E357` also retuned four `.logos`-scoped declarations
 * in `home.css` — see the measured note there. The row is 1076.9px against 1096px of
 * space at 1160: NINETEEN PIXELS OF SLACK. Adding a sixth name, or a longer one,
 * wraps it. ⚠ MEASURE IN-APP WITH THE FONT CONFIRMED — the brief's own figures came
 * from a blocked-font container and were a fallback face, which is what made its
 * first sizing ship a wrapped row.
 */
export function LogoRibbon() {
  return (
    <>
      {/* LOGO STRIP */}
      <div className="logos">
        <div className="wrap">
          <div className="row">
            <span className="co"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="4.9" cy="11.9" r="4.1" /><circle cx="19.1" cy="11.9" r="4.1" /><path d="M9.2 11.9 10.8 8.9 12.3 14.2 14 11.9" /></svg>medlinq.ai</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.2c-1.7 0-2.5-.8-4-.8-1.7 0-2.8 1.3-2.8 3.5 0 1.8.5 2.9.9 4.6.4 2 .4 3.8.8 5.6.26 1.4.7 2.3 1.5 2.3.95 0 1.3-1.2 1.65-2.8.3-1.5.6-2.6 1.3-2.6s1 1.1 1.3 2.6c.35 1.6.7 2.8 1.65 2.8.8 0 1.24-.9 1.5-2.3.4-1.8.4-3.6.8-5.6.4-1.7.9-2.8.9-4.6 0-2.2-1.1-3.5-2.8-3.5-1.5 0-2.3.8-4 .8Z" /></svg>Northeast Florida Smiles</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.2" /><path d="M5.6 19.2a6.4 6.4 0 0 1 12.8 0" /></svg>Palencia MedSpa</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 10.2a7.2 7.2 0 0 1 14.4 0v1.9a7.2 7.2 0 0 1-14.4 0Z" /><path d="M4.9 10.3h14.2M4.9 13.1h14.2" /><path d="M8.6 10.3v2.8M12 10.3v2.8M15.4 10.3v2.8" /></svg>Clairemont Orthodontics</span>
            <span className="co"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.2c-1.7 0-2.5-.8-4-.8-1.7 0-2.8 1.3-2.8 3.5 0 1.8.5 2.9.9 4.6.4 2 .4 3.8.8 5.6.26 1.4.7 2.3 1.5 2.3.95 0 1.3-1.2 1.65-2.8.3-1.5.6-2.6 1.3-2.6s1 1.1 1.3 2.6c.35 1.6.7 2.8 1.65 2.8.8 0 1.24-.9 1.5-2.3.4-1.8.4-3.6.8-5.6.4-1.7.9-2.8.9-4.6 0-2.2-1.1-3.5-2.8-3.5-1.5 0-2.3.8-4 .8Z" /><path d="M8.7 10.6h1.3M11.35 10.6h1.3M14 10.6h1.3" /></svg>South Atlanta Periodontics</span>
          </div>
        </div>
      </div>
    </>
  );
}
