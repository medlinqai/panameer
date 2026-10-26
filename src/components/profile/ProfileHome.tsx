import Link from "next/link";
import { profileChecklist } from "@/lib/dashboard/views";
import { ActionCards } from "@/components/home/AppNav";

// WK-E005: Profile without a tab row — tiles (each a count or Add) and What You Can Do above the profile itself.
export async function ProfileHome({ personId, profileId }: { personId: string; profileId: string }) {
  const c = new Map((await profileChecklist(personId)).map((i) => [i.label, i]));
  const n = (k: string) => c.get(k)?.n ?? 0;
  const tiles: { title: string; lines: [string, number, string, string][] }[] = [
    { title: "Companies", lines: [["Companies", n("Companies"), "/profile/edit/work-history", "Add"]] },
    { title: "Skills", lines: [["Skills", n("Skills"), "/profile/edit/skills", "Add"], ["Specializations", n("Specializations"), "/profile/edit/specializations", "Add"]] },
    { title: "Credentials & Education", lines: [["Credentials", n("Credentials"), "/profile/edit/certifications", "Add"], ["Education", n("Education"), "/profile/edit/education", "Add"]] },
    { title: "Recommendations", lines: [["Received", n("Recommendations"), "/connect/recommendations", "Ask"]] },
  ];
  return (
    <section className="mx-auto mb-6 w-full max-w-6xl" data-profile-home>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.title} className="rounded-[12px] border border-line bg-white p-3.5" data-profile-tile={t.title}>
            <h3 className="text-[14px] font-extrabold">{t.title}</h3>
            {t.lines.map(([l, k, href, add]) => (
              <Link key={l} href={href} className="mt-1 flex items-center justify-between text-[13px] text-ink-2 hover:underline">
                <span>{l}</span>{k > 0 ? <b className="tabular-nums text-ink">{k}</b> : <b className="text-state-pending">{add}</b>}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-[16px] font-extrabold">What You Can Do</h2>
      <div className="mt-2"><ActionCards cards={[
        { label: "Edit Profile", detail: "Title, overview, photo and contact", href: "/profile/edit/bio" },
        { label: "Add a Skill", detail: "Matches come from your skills", href: "/profile/edit/skills" },
        { label: "Ask for a Recommendation", detail: "Profiles with one get picked more often", href: "/connect/recommendations" },
        { label: "View as a Buyer", detail: "Your profile the way buyers see it", href: `/providers/${profileId}` },
      ]} /></div>
    </section>
  );
}

const PROFILE_PAGES: [string, string][] = [["Profile", "/profile"], ["Score", "/connect/score"], ["Usage", "/usage"], ["Health", "/account-health"]];
/** ← Profile on Score, Usage and Health, with "Also in Profile" beside it (they replace the Profile tab row). */
export function ProfileCrumb({ page }: { page: string }) {
  const others = PROFILE_PAGES.filter(([l]) => l !== page && l !== "Profile");
  return (
    <p className="mx-auto mb-3 flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-2 text-[13px] font-semibold text-ink-2" data-profile-crumb>
      <span><Link href="/profile" className="hover:text-ink">← Profile</Link><span className="text-ink-3"> › {page}</span></span>
      <span className="font-normal">Also in Profile: {others.map(([l, h], i) => <span key={h}>{i > 0 && " · "}<Link href={h} className="font-semibold text-ink hover:underline">{l}</Link></span>)}</span>
    </p>
  );
}
