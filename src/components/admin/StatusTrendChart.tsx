import type { TrendSeries } from "@/lib/onboarding-trend";

export function StatusTrendChart({
  series,
  variant = "line",
  /** The word for what is being counted — "entering" reads wrong for a join. */
  verb = "entering",
}: {
  series: Omit<TrendSeries, "status"> & { status: string };
  variant?: "line" | "bar";
  verb?: string;
}) {
  const { points, period, status, total, sources } = series;

  if (points.length === 0 || total === 0) {
    return (
      <div className="rounded-brand border border-line bg-white p-8 text-center">
        <p className="text-[15px] font-semibold text-ink">
          No users {verb === "entering" ? "entered" : "joined"} {status} in this period.
        </p>
        <p className="mt-1 text-[13px] text-ink-2">
          Nothing has been recorded on {sources.join(" or ")} yet.
        </p>
      </div>
    );
  }

  const W = 760;
  const H = 260;
  const PAD = { top: 16, right: 16, bottom: 46, left: 46 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const max = Math.max(...points.map((p) => p.count), 1);
  const x = (i: number) =>
    variant === "bar"
      ? PAD.left + (iw / points.length) * (i + 0.5)
      : PAD.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.count)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + ih} L${x(0)},${PAD.top + ih} Z`;

  /* At most ~8 tick labels, or a daily view writes an unreadable axis. */
  const stride = Math.max(1, Math.ceil(points.length / 8));
  const yTicks = [0, 0.5, 1].map((f) => Math.round(max * f));

  return (
    <div className="rounded-brand border border-line bg-white p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full text-ink-2"
        role="img"
        aria-label={`Users ${verb} ${status} per ${period}. ${total} in total across ${points.length} ${period}s. Peak ${max}.`}
      >
        {/* gridlines + y axis — currentColor, so the theme owns the neutral */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              strokeOpacity="0.18"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
            >
              {v}
            </text>
          </g>
        ))}

        {variant === "bar" ? (
          // INK, NOT MAGENTA — a bar is not interactive. `currentColor`
          points.map((p, i) => {
            const slot = iw / points.length;
            const w = Math.max(2, slot * 0.62);
            const h = (p.count / max) * ih;
            return p.count === 0 ? null : (
              <rect
                key={p.key}
                x={PAD.left + slot * i + (slot - w) / 2}
                y={PAD.top + ih - h}
                width={w}
                height={h}
                fill="currentColor"
                fillOpacity="0.75"
                rx="2"
              />
            );
          })
        ) : (
          <>
            <path d={area} fill="var(--color-magenta)" fillOpacity="0.12" />
            <path
              d={line}
              fill="none"
              stroke="var(--color-magenta)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p, i) => (
              <circle key={p.key} cx={x(i)} cy={y(p.count)} r="3" fill="var(--color-magenta)" />
            ))}
          </>
        )}

        {/* THE END LABELS ANCHOR INWARD, they do not centre. A centred label on */}
        {points.map((p, i) =>
          i % stride === 0 || i === points.length - 1 ? (
            <text
              key={p.key}
              x={x(i)}
              y={H - PAD.bottom + 18}
              textAnchor={
                i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
              }
              fontSize="11"
              fill="currentColor"
            >
              {p.label}
            </text>
          ) : null
        )}

        {/* BOTH AXES ARE LABELLED, and the period is named on the x axis. */}
        <text x={PAD.left + iw / 2} y={H - 6} textAnchor="middle" fontSize="11.5" fill="currentColor" fontWeight="600">
          {period === "day" ? "Day" : period === "week" ? "Week commencing" : "Month"}
        </text>
        <text
          transform={`rotate(-90) translate(${-(PAD.top + ih / 2)} 13)`}
          textAnchor="middle"
          fontSize="11.5"
          fill="currentColor"
          fontWeight="600"
        >
          Users {verb === "entering" ? "entering" : "joining"}
        </text>
      </svg>

      {/* THE SAME NUMBERS AS TEXT — see the docblock. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] font-semibold text-ink-2">
          Show the numbers ({points.length} {period}s, {total} total)
        </summary>
        <table className="mt-2 w-full text-left text-[13px]">
          <thead>
            <tr className="text-ink-2">
              <th scope="col" className="py-1 pr-4 font-semibold">
                {period === "day" ? "Day" : period === "week" ? "Week commencing" : "Month"}
              </th>
              <th scope="col" className="py-1 font-semibold">Users {verb} {status}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.key} className="border-t border-line">
                <td className="py-1 pr-4">{p.label}</td>
                <td className="py-1 tabular-nums">{p.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
