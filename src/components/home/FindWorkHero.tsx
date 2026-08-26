"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * FIND WORK — the search hero (E134-provider-home-design.png).
 *
 * The gradient and its two endpoints come from tokens measured out of the PNG
 * (WS3); nothing here is an eyeballed hex.
 *
 * THE SEARCH BACKEND IS OUT OF SCOPE and this component does not pretend
 * otherwise. Submitting routes to the SIGNED-IN provider feed at
 * `/find-work?q=`, which reads the query — `searchParams: { tab?, q? }` and
 * `const query = (sp.q ?? "").trim()` in `(app)/find-work/page.tsx`. That is
 * the brief's instruction — wire the box, don't build the engine — and it beats
 * a disabled input, which would tell a provider nothing about what this page is
 * for.
 *
 * ⚠⚠ SUPERSEDED 2026-08-26 (`P1-ALL-E021`) — the dead text, kept per convention:
 *   "Submitting routes to /work with the query on the URL, where a 'coming
 *    soon' results state explains itself."
 * That was TRUE until the route swap (`P1-ALL-E017`). `/work` is now the PUBLIC
 * BUYER marketing page and has NO `searchParams` at all, so the query branch was
 * sending a signed-in provider to the buyer's page and DISCARDING the search
 * silently — no error, no 404. The empty branch had already been repointed.
 * ⚠ DO NOT "FIX" A FUTURE VERSION OF THIS BY TEACHING `/work` TO READ `?q=`:
 * `P1-J4-E002` spent three briefs separating the buyer and provider audiences.
 */
export function FindWorkHero({ chips }: { chips: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const go = (query: string) => {
    const trimmed = query.trim();
    router.push(trimmed ? `/find-work?q=${encodeURIComponent(trimmed)}` : "/find-work");
  };

  return (
    <section className="min-w-0">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-magenta">
        Find Work
      </p>
      <h1 className="mt-1.5 font-display text-[30px] font-bold tracking-[-0.5px] text-ink sm:text-[34px]">
        Search Open Job Postings
      </h1>

      <div className="mt-5 overflow-hidden rounded-[26px] bg-[linear-gradient(115deg,var(--color-learn-deep)_0%,var(--color-learn-card)_38%,var(--color-learn-mid)_62%,var(--color-learn-hot)_100%)] px-6 py-7 sm:px-9 sm:py-9">
        <h2 className="font-display text-[27px] font-bold leading-tight text-white sm:text-[32px]">
          Find the Perfect Work
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(q);
          }}
          className="mt-5 flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Describe the job you want…"
            aria-label="Describe the job you want"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-2/70"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-magenta px-6 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Search <span aria-hidden>→</span>
          </button>
        </form>

        {chips.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => go(chip)}
                className="rounded-[10px] border border-white/45 px-4 py-2 text-[14.5px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                {chip} <span aria-hidden>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
