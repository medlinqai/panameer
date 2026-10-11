import Link from "next/link";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { Avatar } from "@/components/Avatar";
import type { WorkCard } from "@/lib/work-feed";
import type { workHome } from "@/lib/work-home";

type Home = Awaited<ReturnType<typeof workHome>>;

// WS-E003: Work Home — funnel picture, KPIs, what's waiting, then the top 5 Best Matches with the buyer's face.
function Funnel({ f, invitations }: { f: Home["funnel"]; invitations: number }) {
  const rows = [
    { label: "Invited", n: f.invited, needsYou: invitations > 0 },
    { label: "Proposed", n: f.proposed, needsYou: false },
    { label: "Agreed", n: f.agreed, needsYou: false },
    { label: "In Work", n: f.inWork, needsYou: false },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div data-work-funnel>
      {rows.map((r) => (
        <div key={r.label} className="my-2.5 grid grid-cols-[84px_1fr_28px] items-center gap-2 text-[12px] font-semibold">
          <span>{r.label}</span>
          <span className="h-4 bg-[#ECEEF4]">
            <span className={"block h-full " + (r.needsYou ? "bg-magenta" : "bg-ink")} style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{r.n}</span>
        </div>
      ))}
      <p className="mt-1 text-[11.5px] text-ink-2">Your work, last 30 days</p>
    </div>
  );
}

export function WorkHome({ home, best }: { home: Home; best: WorkCard[] }) {
  const matches = best.filter((c) => c.matched > 0);
  const waiting = home.invitations
    ? `${home.invitations} invitation${home.invitations === 1 ? " is" : "s are"} waiting on your rate.${home.newest ? ` The newest: ${home.newest.title}, from ${home.newest.from}.` : ""}`
    : home.proposalsOut
      ? `Nothing is waiting on you. ${home.proposalsOut} proposal${home.proposalsOut === 1 ? " is" : "s are"} with buyers.`
      : "Nothing is waiting on you. Propose your rate on a Best Match to get started.";
  return (
    <div data-work-home>
      <AccountHero
        picture={<Funnel f={home.funnel} invitations={home.invitations} />}
        eyebrow="Work"
        title="Find Your Next Engagement"
        kpis={[
          { value: matches.length, label: "Best Matches" },
          { value: home.invitations, label: "Invitations" },
          { value: home.proposalsOut, label: "Proposals Out" },
          { value: home.openOrders, label: "Open Work Orders" },
        ]}
        paragraph={<p>{waiting}</p>}
        actions={
          <>
            {home.invitations > 0 && <Link href="/find-work?tab=invitations" className={HERO_BTN}>Answer Invitations</Link>}
            <Link href="/find-work?tab=best" className={home.invitations > 0 ? HERO_BTN_W : HERO_BTN}>See Best Matches</Link>
          </>
        }
      />
      <h2 className="mb-2 mt-7 text-[20px] font-bold">Best Matches for Your Skills</h2>
      {matches.length === 0 ? (
        <p className="border-t border-line py-4 text-[14px] text-ink-2">No posted work request matches your skills yet. Add skills to your profile, or see all work requests.</p>
      ) : (
        <ul data-best-matches>
          {matches.slice(0, 5).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3">
              <span className="flex min-w-0 items-center gap-3">
                <Avatar firstName={c.identity.personFirstName} lastName={c.identity.personLastName} photoUrl={c.identity.personPhotoUrl} size={40} />
                <span className="min-w-0">
                  <Link href={`/find-work/${c.id}`} className="block truncate text-[14.5px] font-bold hover:text-magenta">{c.title}</Link>
                  <span className="block text-[12px] text-ink-3">
                    {[c.identity.companyName ?? c.identity.personName, c.worksite, c.duration, `matches ${c.matched} of your skills`, c.budgetLabel].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </span>
              <Link href={`/find-work/${c.id}`} className="inline-flex min-h-10 items-center border border-ink px-4 text-[13px] font-semibold hover:bg-surface-hover">Propose My Rate</Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/find-work?tab=recent" className="mt-3 inline-block border-t border-line pt-3 text-[14px] font-bold text-magenta-dark">See All Work Requests →</Link>
    </div>
  );
}
