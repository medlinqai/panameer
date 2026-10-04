import Link from "next/link";
import { GetTheTalentShot } from "@/components/marketing-home/GetTheTalentShot";

const NEEDS = [
  {
    what: "an expert",
    when: "when the fix needs judgement — a rate structure to renegotiate, a process to redesign",
  },
  {
    what: "a service product",
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
        {}
        <div className="eyebrow">Hire Talent from Within Your Roadmap</div>
        {}
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

        {}
        <GetTheTalentShot />

        {}
        <blockquote className="gtt-quote">
          <p>
            If you want to move forward, we have the world&rsquo;s best Oracle talent
            &mdash; the same people who built the assessment.
          </p>
        </blockquote>

        <div className="gtt-cta">
          <Link className="btn btn-solid" href="/assess">
            Start the Assessment &rsaquo;
          </Link>
          <Link className="btn btn-ghost" href="/talent">
            See the Bench
          </Link>
        </div>

        {/* Quiet, and at the foot. Not a section. */}
        <p className="gtt-supply">
          <Link href="/work">
            Are you the expert? See how work reaches you &rarr;
          </Link>
        </p>
      </div>
    </section>
  );
}
