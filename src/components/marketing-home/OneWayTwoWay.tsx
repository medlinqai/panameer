
const LAYERS: { layer: string; sellable: string; built: string }[] = [
  {
    layer: "You",
    sellable: "Set a rate for your hours or a retainer",
    built: "Your profile builds itself from your work history.",
  },
  {
    layer: "Your credentials",
    sellable: "Earn verified proof that lifts the rate",
    built: "Panameer issues it and hosts the page that checks it.",
  },
  {
    layer: "Your service products",
    sellable: "Publish a fixed-scope service product at a fixed price",
    built: "A real listing with its own scope and price.",
  },
  {
    layer: "Your deployable assets",
    sellable: "Attach what you built — a report, a model, a tool",
    built: "Stored with the work it came from.",
  },
];

export function OneWayTwoWay() {
  return (
    <section className="sd">
      <div className="wrap">
        <p className="eyebrow">Why this is different</p>
        {}
        <h2>
          On other platforms you <b>are</b> the product. Here you <b>have</b>{" "}
          products.
        </h2>
        <p className="sd-lead">
          A one-way profile has exactly <strong>one</strong> thing to list: you.
          Your profile here fronts <strong>{LAYERS.length}</strong> layers, and
          every one of them is separately sellable.
        </p>

        {}
        <dl className="owtw-grid">
          {LAYERS.map((l, i) => (
            <div className="owtw-row" key={l.layer}>
              <span className="owtw-n" aria-hidden>
                {i + 1}
              </span>
              <div className="owtw-body">
                <dt className="owtw-layer">{l.layer}</dt>
                <dd className="owtw-sell">{l.sellable}</dd>
                {}
                <dd className="owtw-built">{l.built}</dd>
              </div>
            </div>
          ))}
        </dl>

        {}
        <p className="owtw-note">
          Build the stack now — buyer checkout for packages and assets is still
          in development.
        </p>
      </div>
    </section>
  );
}
