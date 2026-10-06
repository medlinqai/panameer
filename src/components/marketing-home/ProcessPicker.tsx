import type { CSSProperties } from "react";
import Link from "next/link";
import { PROCESSES, type BusinessProcess } from "@/lib/processes";

/** A live process routes; a coming-soon one must not look clickable. */
function CardBody({ p }: { p: BusinessProcess }) {
  return (
    <>
      {}
      <span
        className="pp-media"
        aria-hidden
        style={
          {
            "--tint": p.tint,
            "--deep": p.deep,
            ...(p.media ? { backgroundImage: `url('${p.media}')` } : null),
          } as CSSProperties
        }
      />
      <span className="pp-scrim" aria-hidden />
      {/* Only when there is something to play. See the header note. */}
      {p.media && (
        <span className="pp-play" aria-hidden>
          &#9654;
        </span>
      )}

      <span className="pp-abbr">{p.abbr}</span>
      <span className="pp-name">{p.name}</span>
      <span className="pp-blurb">{p.blurb}</span>
      <span className="pp-foot">
        {}
        <span className="pp-meta">
          {p.domainCount === null ? "" : `${p.domainCount} capability domains`}
        </span>
        <span className={"pp-chip " + (p.status === "live" ? "is-live" : "is-soon")}>
          {p.status === "live" ? "Live" : "Coming soon"}
        </span>
      </span>
    </>
  );
}

export function ProcessPicker() {
  return (
    <section className="pp" id="step-process">
      <div className="wrap">
        {/* THE EYEBROW IS GONE FROM HERE */}
        {/* E139 — SHIPPED AS THE EXACT LITERAL, INCLUDING NO TERMINAL PERIOD. */}
        {/* E230 — VERBATIM, Scott 2026-08-20. The detail is DROPPED, not lost */}
        <h2 className="pp-h2">
          Choose the business process you are most familiar with.
        </h2>

        <div className="pp-grid">
          {PROCESSES.map((p) =>
            p.status === "live" ? (
              // A REAL LINK, because this one goes somewhere. One anchor with
              <Link className="pp-card" key={p.key} href="/assess">
                <CardBody p={p} />
              </Link>
            ) : (
              // A DIV, NOT A DISABLED LINK. Coming-soon processes must not be
              <div className="pp-card is-soon" key={p.key}>
                <CardBody p={p} />
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
