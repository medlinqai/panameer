/**
 * `/`'s MACRO SECTION — ONE LISTING VERSUS A STACK (`P1-J0-E314`).
 *
 * Scott, 2026-08-24: *"awesome...build something to that effect for the home page
 * in the next talent brief."* And the line, his:
 *
 *     "On LinkedIn you ARE the product. On Panameer you HAVE products."
 *
 * ── ⚠⚠ LINKEDIN IS NOT NAMED ON THE PAGE, AND THAT IS A DECISION ────────────
 *
 * His framing names it; the rendered copy does not. Naming a competitor in
 * marketing copy is a legal and tonal risk, Scott did not ask for it, and THE
 * CONTRAST IS THE IDEA, NOT THE BRAND. So the section says what a one-way
 * platform IS and what this one is, and lets the reader supply the name they
 * already have in mind. ⚠ REPORTED as a decision, not slipped in.
 *
 * ── ⚠ WHY THIS SECTION EXISTS AT ALL ───────────────────────────────────────
 *
 * `/` HAS NO MACRO STATEMENT RIGHT NOW. `zero to hero` was his home framing until
 * `P1-J0-E313` spent it on `/learn`'s `<h1>`, and `brief_home_strip` (`c9d8c74`)
 * removed the strip, the process picker and the spine — so the page currently goes
 * hero, talent, tracker, with nothing saying what the place IS.
 *
 * ── ⚠⚠ THE TENSE IS THE WHOLE HONESTY PROBLEM, AND IT IS RESOLVED ONE WAY ───
 *
 * A provider genuinely CAN build every layer below: `/settings/packages` publishes
 * a real service product, and the credential is real and verified since `c68fad4`.
 * ⚠ BUT NOTHING IN THE STACK CAN BE BOUGHT. `(app)/packages`,
 * `(app)/services/offers`, `(app)/hire` and `(app)/search` are ALL `ComingSoon`,
 * there is NO `Offer` model, and 0 of 23 learning paths have a sittable test
 * (`P1-J3-E030`).
 *
 * ⚠ SO EVERY LINE IS WRITTEN AS WHAT A PROVIDER CAN **BUILD** HERE, NEVER AS WHAT
 * A BUYER CAN **PURCHASE** TODAY. The verbs are `build`, `publish`, `earn`, `set` —
 * all of them things the provider does on surfaces that exist. ⚠ NOT ONE LINE SAYS
 * a buyer browses, hires, orders or pays. Do not add one until the shop floor
 * exists; that is the difference between a positioning claim and a false one.
 *
 * ── ⚠ THE COUNT IS THE ARGUMENT, NOT THE ADJECTIVE ──────────────────────────
 *
 * `DEEPER` is countable, which is why the claim survives scrutiny: one listing
 * versus four separately sellable layers. The section SHOWS `1` and `4` rather
 * than asserting "deeper". ⚠ THOSE TWO NUMBERS ARE STRUCTURAL, NOT DATA — they
 * count the layers this design has, not rows in a table, so they cannot go stale
 * the way `E284`'s six-step drawing did.
 *
 * ── MECHANICS ──────────────────────────────────────────────────────────────
 *
 * ⚠ A SECTION, NOT AN IMAGE. Scott: *"Build an image or a section"* — a four-layer
 * stack drawn as art goes stale and he cannot edit it, which is exactly what
 * `P1-J0-E284` cost.
 *
 * ⚠ `.pm-home` IS AVAILABLE HERE — this renders on `/`, inside the wrapper, so it
 * uses `home.css`'s own classes and variables directly. No Tailwind mirroring, no
 * duplicated values. That is the one advantage `/` has over `/learn` and
 * `/hire-talent`, and it is used.
 *
 * ⚠ NO CLIENT BOUNDARY. `/` prerenders `○` and `check:ui` asserts it.
 *
 * ── ⚠ HOW THIS SITS BESIDE THE PARKED FOUR-AUDIENCE SECTION ────────────────
 *
 * `brief_home_four_audiences_2026-08-24.md` (`P1-J0-E311`) is parked and edits the
 * same file. IT IS A DIFFERENT SUBJECT and the two do not duplicate:
 *
 *     this section        WHAT you have here      one listing vs four layers
 *     four-audience       WHO it is sold to       three parties SAVE, one MAKEs
 *
 * ⚠ THEY ARE COMPLEMENTARY AND THE ORDER MATTERS: this one establishes that output
 * is sellable, which is what makes the four-audience section's MAKE row mean
 * anything. This should precede it. ⚠ Neither has been walked next to the other;
 * flagged rather than assumed.
 */

/**
 * ⚠ THE FOUR LAYERS, AS DATA. Adding a fifth is an edit here and nothing else —
 * and the `1 vs 4` counter below derives from the array's length, so it cannot
 * disagree with the list it labels.
 */
const LAYERS: { layer: string; sellable: string; built: string }[] = [
  {
    layer: "You",
    /* ⚠ `set a rate` — the rate range is real (`rate_min/max_cents`). Nothing here
       says a buyer books the hours, because nobody can. */
    sellable: "Set a rate for your hours or a retainer",
    built: "Your profile builds itself from your work history.",
  },
  {
    layer: "Your credentials",
    /* ⚠ TRUE SINCE `c68fad4` — `issued_from = LEARN`, `public_credential_url` holds
       `/verify/{id}`, and a learner with no seller profile now earns a real one. */
    sellable: "Earn verified proof that lifts the rate",
    built: "Panameer issues it and hosts the page that checks it.",
  },
  {
    layer: "Your service products",
    /* ⚠ `/settings/packages` PUBLISHES A REAL ONE. `Package` is the productized
       offering with a title, a scope and a price. */
    sellable: "Publish a fixed-scope package at a fixed price",
    built: "A real listing with its own scope and price.",
  },
  {
    layer: "Your deployable assets",
    /* ⚠ THE THINNEST OF THE FOUR and it is written as a container, not a promise —
       "what you built" rather than "an agent you sell". Artifact storage exists;
       an asset marketplace does not. */
    sellable: "Attach what you built — a report, a model, a tool",
    built: "Stored with the work it came from.",
  },
];

export function OneWayTwoWay() {
  return (
    <section className="sd">
      <div className="wrap">
        <p className="eyebrow">Why this is different</p>
        {/*
          ⚠ SCOTT'S LINE, RESTATED WITHOUT THE BRAND NAME. His original was *"On
          LinkedIn you ARE the product. On Panameer you HAVE products."* — the
          structure, the contrast and the capitalised verbs are his; only the
          competitor's name is removed. See the file header.
        */}
        <h2>
          On other platforms you <b>are</b> the product. Here you <b>have</b>{" "}
          products.
        </h2>
        <p className="sd-lead">
          A one-way profile has exactly <strong>one</strong> thing to list: you.
          Your profile here fronts <strong>{LAYERS.length}</strong> layers, and
          every one of them is separately sellable.
        </p>

        {/*
          ⚠ A DEFINITION LIST, because that is what this is — a layer and what it
          is sellable as. Not a table: there is no second axis, and a table would
          need a header row saying "layer" and "sellable as" to say what the two
          columns already say.
        */}
        <dl className="owtw-grid">
          {LAYERS.map((l, i) => (
            <div className="owtw-row" key={l.layer}>
              <span className="owtw-n" aria-hidden>
                {i + 1}
              </span>
              <div className="owtw-body">
                <dt className="owtw-layer">{l.layer}</dt>
                <dd className="owtw-sell">{l.sellable}</dd>
                {/*
                  ⚠ THE SECOND LINE IS WHAT EXISTS, IN THE PRESENT TENSE, AND IT IS
                  WHAT KEEPS EACH ROW HONEST. Every one describes a surface a
                  provider can reach today. ⚠ NOT ONE OF THEM SAYS A BUYER DOES
                  ANYTHING — see the file header.
                */}
                <dd className="owtw-built">{l.built}</dd>
              </div>
            </div>
          ))}
        </dl>

        {/*
          ⚠ THE LIMIT, SAID OUT LOUD RATHER THAN OMITTED. The stack is buildable
          today and not yet buyable, and a section that implied otherwise would be
          the strongest false claim on the site. ⚠ DO NOT DELETE THIS LINE TO
          TIGHTEN THE SECTION — it is what makes the four rows above defensible.
        */}
        <p className="owtw-note">
          Build the stack now — buyer checkout for packages and assets is still
          in development.
        </p>
      </div>
    </section>
  );
}
