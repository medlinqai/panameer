import Link from "next/link";
import { getBrowseTree, AUDIENCE_LABEL } from "@/lib/learn";

export const metadata = {
  title: "Learn — Panameer",
  description:
    "Free Oracle Cloud courses: procurement, finance, supply chain and HR, taught by the people who implement them.",
};

/**
 * Public Learn browse (brief_learn_v1 WS2) — Audience → Group → Learning Path.
 *
 * NOT the `CascadeTier` component, and that is a deliberate call. Cascade is
 * built for PICKING one thing: it collapses what you have chosen and hides the
 * rest, which is right when the goal is a single answer (a role, a domain) and
 * wrong for a public catalog, where the goal is to see what exists. Someone
 * landing here has not decided anything yet. So the whole tree is on the page,
 * grouped and scannable, and the deciding happens by clicking into a path.
 */
export default async function LearnPage() {
  const tree = await getBrowseTree();
  const totalPaths = tree.reduce((n, a) => n + a.groups.reduce((m, g) => m + g.paths.length, 0), 0);
  const totalLessons = tree.reduce(
    (n, a) => n + a.groups.reduce((m, g) => m + g.paths.reduce((k, p) => k + p.lessons, 0), 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
      <header className="max-w-3xl">
        <h1 className="text-[34px] font-extrabold tracking-[-0.8px] sm:text-[40px]">
          Learn Oracle Cloud from the people who implement it
        </h1>
        <p className="mt-4 text-[17.5px] leading-relaxed text-ink-2">
          {totalPaths} learning paths, {totalLessons}{" "}
          lessons — free. Start
          anywhere; enrol to track what you&apos;ve finished.
        </p>
      </header>

      {tree.length === 0 ? (
        <p className="mt-12 text-[15px] text-ink-2">
          The catalog is being loaded. Check back shortly.
        </p>
      ) : (
        <div className="mt-14 space-y-16">
          {tree.map((a) => (
            <section key={a.audience}>
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
                For {AUDIENCE_LABEL[a.audience] ?? a.audience}
              </h2>

              <div className="mt-6 space-y-10">
                {a.groups.map((g) => (
                  <div key={g.group}>
                    <h3 className="text-[20px] font-bold">{g.group}</h3>
                    <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {g.paths.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/learn/${p.slug}`}
                            className="flex h-full flex-col rounded-brand border border-line bg-white p-5 transition-colors hover:border-magenta"
                          >
                            <p className="font-bold leading-snug">{p.title}</p>
                            {p.summary && (
                              <p className="mt-2 line-clamp-2 text-[14px] text-ink-2">
                                {p.summary}
                              </p>
                            )}
                            <p className="mt-auto pt-4 text-[13px] text-ink-2">
                              {p.lessons} lesson{p.lessons === 1 ? "" : "s"}
                              {/*
                                Say how many are watchable TODAY. With no video
                                URLs loaded that reads "0 ready to watch" on every
                                card, which is honest — the alternative is a
                                catalog that looks complete and disappoints on the
                                first click.
                              */}
                              {" · "}
                              <span className={p.playable > 0 ? "text-emerald-600" : ""}>
                                {p.playable} ready to watch
                              </span>
                              {p.expert ? ` · ${p.expert}` : ""}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
