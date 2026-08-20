import Link from "next/link";
import { GetTheTalentShot } from "@/components/marketing-home/GetTheTalentShot";

/**
 * "GET THE TALENT" — the close (brief_home_assessment_spine §4).
 *
 * ── NOT A MENU. THAT IS THE WHOLE POINT ──────────────────────────────────────
 *
 * The brief is explicit that this is not a generic talent / packages / agents
 * triptych. By the time a reader is here the dashboard has already named
 * specific fixes, so the claim is about MATCHING: the right resource is
 * whatever each recommendation happens to need — an expert for one, a package
 * for another, a pre-built agent for a third. The three items are therefore
 * rendered as one sentence-shaped row keyed to "each recommendation", not as
 * three competing cards you are asked to choose between.
 *
 * ── SCOTT'S COPY IS VERBATIM, WINK INCLUDED ──────────────────────────────────
 *
 * "Or take our assessment to a consulting firm and pay 250% more to meet us
 * later. 😉" — the brief says verbatim, and the emoji is load-bearing: it is
 * what turns a jab into a joke. Do not sand it off, and do not soften "250%".
 *
 * ⚠ THE ONE THING THAT WOULD BREAK THIS: the positioning guardrail in
 * `panameer_virtual_firm_identity.md` says never compete on price. This line
 * is not a price claim — it is a markup claim about consulting firms, which is
 * the opposite argument. Left exactly as written.
 *
 * ── THE PROVIDER LINK IS A LINK, NOT A SECTION ───────────────────────────────
 *
 * Rationale from the brief, recorded here so it does not get "improved" into a
 * banner: this page recruits supply precisely BECAUSE it was built for buyers.
 * A provider reading it sees a demand engine, not a job board. One quiet line
 * at the foot is enough — the page has already made the argument by existing.
 */

const NEEDS = [
  {
    what: "an expert",
    when: "when the fix needs judgement — a rate structure to renegotiate, a process to redesign",
  },
  {
    what: "a package",
    when: "when it is a known piece of work with a known shape and a fixed price",
  },
  {
    what: "a pre-built agent",
    when: "when the fix is a rule that should just run — a price alert, a match exception",
  },
];

export function GetTheTalent() {
  return (
    <section className="gtt">
      <div className="wrap">
        {/*
          ⚠ E235 — TITLE CASE IN SOURCE. `.eyebrow` applies
          `text-transform:uppercase`, and every other eyebrow on this page is
          authored in title case; hardcoding caps here would be the odd one out.

          ⚠ `Talent`, NOT `Experts`, and that was decided rather than defaulted:
          `expert` is already load-bearing on this page for the REVIEWER (step 5's
          eyebrow and title), while this section is who you HIRE TO DO THE WORK.
          It echoes the nav's `Find Talent`, and the section shows three resource
          types — *talent* stretches to cover a package, *expert* does not.
        */}
        <div className="eyebrow">Hire Talent for Your Roadmap</div>
        {/*
          ⚠ E236 IS CHAT'S RECOMMENDATION, NOT SCOTT'S VERBATIM, and the brief
          says so. Scott proposed "Hire your experts directly from the solution
          line in your AI Roadmap"; chat flagged that it narrows to one of three
          cards and that *hire* is wrong for an agent you DEPLOY, and Scott did
          not pick between the alternatives offered. This covers all three and
          avoids echoing the new eyebrow's `hire`/`roadmap`.
          ⚠ IF SCOTT HAS SINCE SAID OTHERWISE, HIS STRING WINS.

          ⚠ THE SUB-LINE BELOW IS UNTOUCHED — "Not a menu to browse…" is what
          actually carries the pre-scoped-shortcut point.
        */}
        <h2 className="gtt-h2">
          Every solution line in your AI Roadmap is something you can hire, buy
          or deploy.
        </h2>

        <p className="gtt-lead">
          Not a menu to browse. The right resource is whatever each
          recommendation needs &mdash;
        </p>

        <ul className="gtt-needs">
          {NEEDS.map((n) => (
            <li className="gtt-need" key={n.what}>
              <span className="gtt-what">{n.what}</span>
              <span className="gtt-when">{n.when}</span>
            </li>
          ))}
        </ul>

        {/*
          ⚠ PLACED DIRECTLY UNDER THE THREE-COLUMN BLOCK IT ILLUSTRATES (E176). The brief
          says "below the existing three-column text block and above the CTA pair", and the
          quote sits between those two anchors, so either side of it satisfies the letter of
          it. Under the list is the version that earns its place: the list names an expert,
          a package and a pre-built agent in the abstract and the shot is those same three
          made concrete, so the reader meets the idea and the instance together. The quote
          and the CTA pair both still follow it.
        */}
        <GetTheTalentShot />

        {/* Scott's copy, verbatim. */}
        <blockquote className="gtt-quote">
          <p>
            If you want to move forward, we have the world&rsquo;s best Oracle talent
            &mdash; the same people who built the assessment.
          </p>
          <p>
            Or take our assessment to a consulting firm and pay 250% more to meet
            us later. <span className="gtt-wink">&#128521;</span>
          </p>
        </blockquote>

        <div className="gtt-cta">
          <Link className="btn btn-solid" href="/assess">
            Start the Assessment &rsaquo;
          </Link>
          <Link className="btn btn-ghost" href="/hire-talent">
            See the Bench
          </Link>
        </div>

        {/* Quiet, and at the foot. Not a section. */}
        <p className="gtt-supply">
          <Link href="/find-work">
            Are you the expert? See how work reaches you &rarr;
          </Link>
        </p>
      </div>
    </section>
  );
}
