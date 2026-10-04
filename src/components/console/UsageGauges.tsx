import Link from "next/link";
import { isCounted } from "@/lib/figure";
import { Gauge, formatFigure } from "@/components/console/Gauge";
import { levelFor, USAGE_LEVEL_LABEL, type UsageArea, type UsageSub } from "@/lib/usage-areas";
import "@/components/console/gauges.css";

export function UsageGauges({ areas }: { areas: UsageArea[] }) {
  return (
    <section className="mt-10">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-bold">Your Activity</h2>
        {}
        <small className="text-[12px] text-ink-3">Hover a gauge for detail</small>
      </div>

      <div className="pm-gauges">
        {areas.map((a) => (
          <Card key={a.key} area={a} />
        ))}
      </div>
    </section>
  );
}

function Sub({ sub }: { sub: UsageSub }) {
  const fig = sub.figure;
  const counted = isCounted(fig);
  return (
    <div className="pm-gauge-sub">
      <span>{sub.label}</span>
      {}
      {counted ? (
        <strong>{fig.toLocaleString("en-US")}</strong>
      ) : (
        <strong>
          <span className="pm-gauge-nc" title={fig.uncounted}>
            NOT COUNTED
          </span>
        </strong>
      )}
    </div>
  );
}

function Card({ area: a }: { area: UsageArea }) {
  const fig = a.figure;
  const counted = isCounted(fig);
  const level = levelFor(fig, a.goal);

  return (
    <div
      className="pm-gauge"
      data-gauge={a.key}
      data-counted={counted ? "yes" : "no"}
    >
      {}
      <p className="pm-gauge-eyebrow" data-gauge-eyebrow>
        {a.eyebrow}
      </p>
      <p className="pm-gauge-label">{a.label}</p>

      <Gauge figure={fig} goal={a.goal} money={a.money} label={a.label} />

      {}
      {}
      <div className="pm-gauge-scale">
        {a.goal != null ? (
          <span data-goal>
            Goal: {formatFigure(a.goal, a.money)}
            {}
            {level && (
              <span className="pm-gauge-level" data-level={level}>
                {USAGE_LEVEL_LABEL[level]}
              </span>
            )}
          </span>
        ) : (
          <span />
        )}
      </div>

      {}
      <div className="pm-gauge-value">
        {counted ? (
          formatFigure(fig, a.money)
        ) : (
          <span aria-hidden>&mdash;</span>
        )}
      </div>
      {!counted && (
        <>
            {}
          <span className="pm-gauge-why">{fig.uncounted}</span>
        </>
      )}

      <div className="pm-gauge-subs">
        <Sub sub={a.subs[0]} />
        <Sub sub={a.subs[1]} />
      </div>

      <Link className="pm-gauge-go" href={a.href}>
        Go to {a.go} &rarr;
      </Link>

      {}
      <div className="pm-gauge-tip" title={a.tip}>
        {a.tip}
      </div>
    </div>
  );
}
