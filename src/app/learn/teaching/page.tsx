import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { teachingData } from "@/lib/learn-teaching";
import { LearnTabs } from "@/components/learn/app/LearnTabs";
import { AccountHero, HERO_BTN } from "@/components/casing/AccountHero";
import { BubbleField } from "@/components/casing/BubbleField";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Teaching — Panameer", description: "The paths you teach: your learners and the questions waiting on you." };
export const dynamic = "force-dynamic";

const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
const BTN = "inline-flex min-h-9 shrink-0 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";

// T-E001/T-E002: Teaching is its own page — hero (paths bubble field + KPIs), then per path its learners and open questions.
export default async function TeachingPage() {
  const viewer = await guardPage("authenticated");
  const data = await teachingData(viewer.userId);
  if (!data || data.paths.length === 0) redirect("/learn/my");
  const { paths, kpis } = data;
  const firstQ = paths.flatMap((p) => p.questions)[0];
  return (
    <>
      <LearnTabs active="teaching" teaches />
      <div className="mx-auto w-full max-w-[1010px] px-4 py-6 sm:px-6" data-learn-teaching>
        <AccountHero
          testId="teaching-hero"
          wide
          picture={
            <BubbleField
              bubbles={paths.map((p) => ({ key: p.id, href: `#path-${p.slug}`, label: p.title, hover: `${p.title} · ${p.learners.length} enrolled`, size: Math.max(1, p.learners.length), fill: p.learners.length ? 1 : null }))}
              me="YOU"
              caption="Bubble size = learners enrolled"
              legend={[{ label: "has learners", swatch: "ink" }, { label: "no learners yet", swatch: "quiet" }]}
            />
          }
          eyebrow="Teaching"
          title="The Paths You Teach"
          kpis={[
            { value: kpis.paths, label: "PATHS YOU TEACH" },
            { value: kpis.learners, label: "LEARNERS ENROLLED" },
            { value: kpis.finishedThisMonth, label: "FINISHED THIS MONTH" },
            { value: kpis.openQuestions, label: "OPEN QUESTIONS" },
          ]}
          paragraph={<>Say hello to new learners and ask the ones who finish what they thought. Their feedback shapes your next lessons.</>}
          actions={firstQ ? <Link href={`/connect/groups/thread/${firstQ.id}`} className={HERO_BTN}>Answer the Oldest Open Question</Link> : undefined}
        />
        {paths.map((p) => (
          <section key={p.id} id={`path-${p.slug}`} className="scroll-mt-24 border-b border-line py-6" data-teach-path={p.slug}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="min-w-0 text-[20px] font-bold">{p.title} <small className="ml-1 text-[12px] font-medium text-ink-3">{p.learners.length} {p.learners.length === 1 ? "learner" : "learners"} · {p.playable} lessons out</small></h2>
              <Link href={`/learn/${p.slug}`} className="text-[13px] font-bold text-magenta-dark underline underline-offset-4">Open Path</Link>
            </div>
            <div className="mt-3 grid gap-x-7 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div>
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-2">Learners</h3>
                {p.learners.length === 0 ? (
                  <p className="mt-2 text-[13.5px] text-ink-2">No one has enrolled yet. Learners show here as they join.</p>
                ) : (
                  <ul className="mt-1">
                    {p.learners.map((l) => {
                      const [first, ...rest] = l.name.split(" ");
                      return (
                        <li key={l.userId} data-learner className="flex items-center gap-3 border-b border-line py-2.5">
                          <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={l.photoUrl} size={32} />
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-[14px]">{l.name}</b>
                            <span className="block text-[12px] text-ink-3">{l.pct}% of lessons out{l.lastActive ? ` · active ${day(l.lastActive)}` : " · not started"}</span>
                            <span aria-hidden className="mt-1 block h-[4px] w-full max-w-[200px] bg-[#C9CDDC]"><span className="block h-full bg-ink" style={{ width: `${l.pct}%` }} /></span>
                          </span>
                          {p.canMessage && <Link href={`/messages?with=${l.userId}`} className={BTN}>Message</Link>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="mt-5 md:mt-0">
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-2">Open Questions</h3>
                {p.questions.length === 0 ? (
                  <p className="mt-2 text-[13.5px] text-ink-2">Nothing waiting on you here.</p>
                ) : (
                  <ul className="mt-1">
                    {p.questions.map((q) => (
                      <li key={q.id} className="border-b border-line py-2.5">
                        <Link href={`/connect/groups/thread/${q.id}`} className="block truncate text-[14px] font-bold hover:underline">{q.title}</Link>
                        <span className="block truncate text-[12px] text-ink-3">{q.lessonTitle} · asked {day(q.askedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
