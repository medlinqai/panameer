/**
 * THE BUYER ↔ SELLER FLOW (E074, Connect primer).
 *
 * Two figures with the five steps of an engagement running between them, each
 * step pointing at whoever acts next. It is the one picture that answers "how
 * does this actually work" without a paragraph.
 *
 * MARKUP AND CSS, NO LIBRARY AND NO IMAGE. A diagram this simple does not need
 * a chart library, and an SVG export could not do the two things that matter
 * here: reflow on a phone, and stay legible when the reader bumps their font
 * size. Every arrow is a character in a flex row, so the whole thing is text
 * that happens to be arranged.
 *
 * A SERVER COMPONENT, deliberately. It is passed into the tab carousel as a
 * prop rather than imported by it, so none of this markup lands in the client
 * bundle — see BeatTabs.
 *
 * THE FIGURES ARE `aria-hidden` AND THE STEPS ARE AN ORDERED LIST. To a screen
 * reader this is "five steps, in order", which is the content; the silhouettes
 * are decoration and announcing them twice would only add noise. The direction
 * of each step is carried in words ("Buyer …", "Seller …"), never by the arrow
 * alone.
 */

type Step = { actor: "buyer" | "seller"; text: string };

const STEPS: Step[] = [
  { actor: "buyer", text: "Buyer creates a Work Request and invites sellers to propose a rate" },
  { actor: "seller", text: "Seller accepts, proposes a rate, and interviews with the buyer" },
  { actor: "buyer", text: "Buyer hires the seller and creates a Work Order" },
  { actor: "seller", text: "Seller creates the solution and bills the buyer" },
  { actor: "buyer", text: "Buyer reviews the settlement request and pays the seller" },
];

/** A silhouette. Magenta for the buyer, ink for the seller, so the rows read. */
function Figure({ label, tone }: { label: string; tone: "magenta" | "ink" }) {
  const fill = tone === "magenta" ? "bg-magenta" : "bg-[#2c2740]";
  return (
    <div className="w-[108px] shrink-0 text-center">
      <div aria-hidden>
        <div className={`mx-auto h-11 w-11 rounded-full ${fill}`} />
        <div className={`mx-auto mt-1.5 h-14 w-24 rounded-t-[46px] rounded-b-[10px] ${fill}`} />
      </div>
      <p className="mt-2.5 text-[15px] font-bold text-ink">{label}</p>
    </div>
  );
}

export function BuyerSellerFlow() {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[auto_1fr_auto] lg:gap-8">
      {/*
        At lg the two figures book-end the list. Below it they sit side by side
        ABOVE the steps: stacking a 108px silhouette on top of five rows and
        another underneath puts 400px between the two people the diagram is
        about, which is the one relationship it exists to show.
      */}
      <div className="flex items-start justify-center gap-10 lg:contents">
        <div className="lg:order-1">
          <Figure label="Service Buyer" tone="magenta" />
        </div>
        <div className="lg:order-3">
          <Figure label="Service Seller" tone="ink" />
        </div>
      </div>

      <ol className="flex flex-col gap-3 lg:order-2">
        {STEPS.map((s, i) => (
          <li
            key={s.text}
            className={
              "flex items-center gap-3 rounded-brand border border-line bg-white px-4 py-3.5 text-[14.5px] font-semibold text-ink sm:px-5 " +
              // The buyer acts from the left, the seller from the right. Row
              // direction is what makes the exchange visible at a glance.
              (s.actor === "buyer" ? "" : "flex-row-reverse text-right")
            }
          >
            <span aria-hidden className="text-[18px] font-black text-magenta">
              {s.actor === "buyer" ? "←" : "→"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="mr-2 text-[12.5px] font-extrabold text-ink-2">
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
