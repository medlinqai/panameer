
type Audience = {
  who: string;
  side: "save" | "make";
  value: string;
};

const SAVE_SIDE: Audience[] = [
  {
    who: "Suppliers",
    side: "save",
    value:
      "A supplier can take the same training your own team takes, free, so they transact the way your process expects instead of the way they guessed.",
  },
  {
    who: "The people who raise the POs",
    side: "save",
    value:
      "Whoever raises the requisition can learn the system they raise it in, free, instead of learning it by interrupting the one person who already knows.",
  },
  {
    who: "Consultants adding a module",
    side: "save",
    value:
      "A consultant can add a module to what they already sell without paying for a course — every path, every lesson, free.",
  },
];

const MAKE_SIDE: Audience = {
  who: "Expert providers",
  side: "make",
  value:
    "Expert providers can build their brand training Oracle Cloud project teams and learners, as well as build their income by mentoring students in one-on-one sessions.",
};

export function FourAudiences() {
  return (
    <section className="sd">
      <div className="wrap">
        {}
        <p className="eyebrow">Learn</p>
        {}
        <h2>
          Three can <b>save</b> money. One can <b>make</b> money.
        </h2>

        {}
        <dl className="aud-grid">
          {SAVE_SIDE.map((a) => (
            <div className="aud-row" data-aud-side={a.side} key={a.who}>
              <span className="aud-chip">Saves</span>
              <dt className="aud-who">{a.who}</dt>
              <dd className="aud-val">{a.value}</dd>
            </div>
          ))}
        </dl>

        {}
        <dl className="aud-make">
          {}
          <div data-aud-side={MAKE_SIDE.side}>
            <span className="aud-chip">Makes</span>
            <dt className="aud-who">{MAKE_SIDE.who}</dt>
            <dd className="aud-val">{MAKE_SIDE.value}</dd>
          </div>
        </dl>

        {}
        <p className="aud-note">
          Training and enrollment are live and free today. One-to-one mentoring
          is arranged between the two people — Panameer does not schedule or
          bill it yet.
        </p>
      </div>
    </section>
  );
}
