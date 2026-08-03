import Link from "next/link";
import { parserHealth } from "@/lib/resume/audit";
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

      <p className="mt-3 text-[12.5px] text-ink-2">
        Measured at publish, against what the provider saved.{" "}
        <Link href="/admin/setup" className="font-semibold text-magenta hover:underline">
          Setup
        </Link>
      </p>
    </section>
  );
}
