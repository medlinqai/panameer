/**
 * STEP 5 GRAPHIC — a human, a slot, and the scorecard already in their hand.
 *
 * ── THE COORDINATOR IS A REAL ROLE, NOT A STOCK PERSON ───────────────────────
 *
 * `panameer_virtual_firm_identity.md`: the Project Coordinator is "assigned the
 * moment the maturity assessment completes… a senior person who translates the
 * read". That doc also names the first one — "Scott is the first retainer" — so
 * the card uses him rather than inventing a plausible stranger. A fabricated
 * name and face on a public page is the same class of unverified claim as the
 * placeholder testimonials further down, and this one at least is true.
 *
 * ⚠ PRE-LAUNCH COPY SWAP. When coordinators beyond Scott exist this becomes
 * whoever is actually assigned, on the same list as the testimonial names and
 * the "● Live" chip. Flagged in the report, not left to be discovered.
 *
 * NO PHOTOGRAPH. Initials, not a face — a real portrait would need a real
 * consent conversation, and a stock face would undo the entire point of the
 * card.
 *
 * ── THE LINE THAT DOES THE WORK ──────────────────────────────────────────────
 *
 * "They already have your scorecard" is the difference between this and every
 * discovery call the reader has ever regretted. It sits ON the card, in the
 * graphic, not only in the prose — because the graphic is what gets looked at.
 *
 * Inert by construction: the slots are spans. Booking happens at /assess, and a
 * fake calendar that swallowed a click would be worse than no calendar.
 */

const SLOTS = [
  { day: "Tue", date: "19", time: "10:30 am", taken: false },
  { day: "Wed", date: "20", time: "2:00 pm", taken: true },
  { day: "Thu", date: "21", time: "9:00 am", taken: false },
];

export function ConsultShot() {
  return (
    <div className="cos">
      <div className="cos-who">
        <span className="cos-av" aria-hidden>
          SW
        </span>
        <span className="cos-wt">
          <b>Scott Walls</b>
          <span>Project Coordinator</span>
        </span>
        {/*
          NOT A STATUS LIGHT. A green "● Available" chip on a marketing page is
          a live-data claim nothing is behind — the same fake-live the rails
          forbid, and the reason the home page still owes a "● Live" swap. This
          states a commitment instead, which is true whenever it is written.
        */}
        <span className="cos-badge">45 minutes</span>
      </div>

      <div className="cos-has">
        <span className="cos-check" aria-hidden>
          &#10003;
        </span>
        <span>
          Has already read your scorecard &mdash; every domain, every score, and the
          ranked opportunities.
        </span>
      </div>

      <div className="cos-slots">
        {SLOTS.map((s) => (
          <span
            key={s.date}
            className={"cos-slot" + (s.taken ? " is-taken" : "")}
          >
            <span className="cos-day">{s.day}</span>
            <span className="cos-date">{s.date}</span>
            <span className="cos-time">{s.taken ? "booked" : s.time}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
