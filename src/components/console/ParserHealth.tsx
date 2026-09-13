import Link from "next/link";
import { parserHealth, parserVariants } from "@/lib/resume/audit";
import { resolveProvider, parserConfigProblem } from "@/lib/resume/ai-provider";

/**
 * PARSER HEALTH — Panameer admin only (brief_j14 WS-H).
 *
 * The headline is ACCURACY: the share of parsed fields a human kept unchanged.
 * Cost sits beneath it, because cost without accuracy is how you talk yourself
 * into a model that saves a cent and costs an hour of correcting.
 *
 * READS REAL WS-G DATA and degrades honestly when there isn't any — an empty
 * store says "no parses recorded yet", never 0% or 100%. Both are lies at n=0,
 * and 100% is the more dangerous one.
 *
 * No charts library: four numbers and a sentence don't need one.
 */
export async function ParserHealth() {
  const h = await parserHealth();
  const variants = await parserVariants();
  const cfg = resolveProvider();
  const problem = parserConfigProblem();

  const pct = (v: number | null | undefined) =>
    v == null ? null : `${Math.round(v * 100)}%`;
  const money = (v: number | null | undefined) =>
    v == null ? null : `$${v.toFixed(5)}`;

  const headline = pct(h.accuracy30d ?? h.accuracy);
  const cost = money(h.costUsd30d ?? h.costUsd);

  return (
    <section className="rounded-brand border border-line bg-white p-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-display text-[17px] font-bold">Parser Health</h2>
        <span className="text-[12.5px] text-ink-2">
          {cfg ? `${cfg.provider} · ${cfg.model}` : "not configured"}
        </span>
      </div>

      {h.total === 0 ? (
        <>
          <p className="mt-3 font-display text-[26px] font-bold leading-none text-ink-2/30">
            —
          </p>
          <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-ink-2">
            No parses recorded yet. This fills in as providers publish profiles
            they built from an uploaded résumé — accuracy is measured by how much
            of the parse they kept, so there is nothing to show until somebody
            has reviewed one.
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 font-display text-[34px] font-bold leading-none text-magenta">
            {headline ?? "—"}
          </p>
          <p className="mt-1 text-[13px] text-ink-2">
            of parsed fields kept as-is{h.accuracy30d != null ? " (last 30 days)" : ""}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Avg $/parse", v: cost ?? "—" },
              {
                k: "Parses (30d)",
                v: String(h.last30d),
              },
              { k: "Parses (total)", v: String(h.total) },
              {
                k: "Avg latency",
                v: h.latencyMs ? `${(h.latencyMs / 1000).toFixed(1)}s` : "—",
              },
            ].map((s) => (
              <div key={s.k} className="rounded-[10px] border border-line px-3 py-2.5">
                <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-2">
                  {s.k}
                </dt>
                <dd className="mt-0.5 font-display text-[17px] font-bold">{s.v}</dd>
              </div>
            ))}
          </dl>

          {cost == null && (
            <p className="mt-3 text-[13px] text-ink-2">
              Cost isn&apos;t computed — set RESUME_PARSER_PRICE_IN_PER_M and
              _OUT_PER_M and it appears on the next parse.
            </p>
          )}
        </>
      )}

      {problem && (
        <p className="mt-3 rounded-[10px] border border-dashed border-line px-3 py-2 text-[13px] text-ink-2">
          {problem}
        </p>
      )}

      {/*
        ── ⚠⚠ BY MODEL + PROMPT, NEVER ONE BLENDED LINE (`P1-A1.5-E488`) ──────

        ⚠ THIS EXTENDS THE CARD, IT DOES NOT REPLACE IT — everything above is
        untouched. A single blended average cannot show that a change made
        things worse, which is the whole reason Scott wants this screen.

        ⚠⚠ NO CHART LIBRARY. package.json carries no recharts/chart.js/d3/visx,
        and a bar per variant is a `<div>` with a width. Adding a dependency to
        draw a handful of rectangles is not a trade worth making.
      */}
      {variants.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-[12.5px] font-bold uppercase tracking-wide text-ink-2">
            By model and prompt
          </h3>
          <p className="mt-1 text-[12px] text-ink-2">
            Yield is objects per 1,000 source characters — it exists the moment a
            run finishes and is what falls first when a model degrades. ⚠ Accuracy
            only exists once a provider has reviewed, so an unreviewed run shows a
            yield and no accuracy. Neither is ever imputed.
          </p>

          <div className="mt-3 space-y-3">
            {variants.map((v) => {
              /* Scale each bar against the widest yield on screen, so the
                 comparison is between variants rather than against an
                 arbitrary ceiling. */
              const max = Math.max(...variants.map((x) => x.yieldPer1k ?? 0), 0.0001);
              const pct = v.yieldPer1k ? Math.max(2, (v.yieldPer1k / max) * 100) : 0;
              return (
                <div key={v.key} className="rounded-[10px] border border-line p-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <b className="text-[13.5px] text-ink">{v.model}</b>
                    <span className="rounded-full bg-ink/[0.06] px-2 py-0.5 text-[11px] font-semibold text-ink-2">
                      {v.promptVersion}
                    </span>
                    {/* ⚠ THE SAMPLE SIZE SITS BESIDE EVERY AVERAGE. */}
                    <span className="text-[12px] text-ink-2">
                      {v.runs} run{v.runs === 1 ? "" : "s"} · {v.objects} objects
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <span className="w-[112px] shrink-0 text-[12px] text-ink-2">Yield</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      {pct > 0 && (
                        /* ⚠ INK, NOT MAGENTA — a bar is not interactive (`E433`). */
                        <span
                          className="block h-full rounded-full bg-ink-2/70"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </span>
                    <span className="w-[132px] shrink-0 text-right text-[12px] tabular-nums text-ink">
                      {v.yieldPer1k === null
                        ? "— no denominator"
                        : `${v.yieldPer1k.toFixed(2)} / 1k (n=${v.yieldRuns})`}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="w-[112px] shrink-0 text-[12px] text-ink-2">Accuracy</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                      {v.accuracy !== null && (
                        <span
                          className="block h-full rounded-full bg-emerald-500/70"
                          style={{ width: `${Math.max(2, v.accuracy * 100)}%` }}
                        />
                      )}
                    </span>
                    <span className="w-[132px] shrink-0 text-right text-[12px] tabular-nums text-ink">
                      {/* ⚠⚠ NEVER IMPUTED. "Not reviewed yet" is the honest answer. */}
                      {v.accuracy === null
                        ? "— not reviewed yet"
                        : `${Math.round(v.accuracy * 100)}% (n=${v.reviewedRuns})`}
                    </span>
                  </div>

                  {Object.keys(v.byType).length > 0 && (
                    <p className="mt-2 text-[12px] text-ink-2">
                      {Object.entries(v.byType)
                        .filter(([, n]) => n > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, n]) => `${k} ${n}`)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="mt-3 text-[12.5px] text-ink-2">
        Measured at publish, against what the provider saved.{" "}
        <Link href="/admin/setup" className="font-semibold text-magenta hover:underline">
          Setup
        </Link>
      </p>
    </section>
  );
}
