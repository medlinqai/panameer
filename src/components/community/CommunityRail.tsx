import Link from "next/link";
import { Face } from "@/components/community/Silhouette";
import { getMyTeams } from "@/lib/teams";
import type { getMyCommunity } from "@/lib/connections";
import type { Viewer } from "@/lib/access";
import { WaitingOnYou } from "@/components/community/ColleagueCards";

/** THE RAIL — MENTORS AND TEAMS WS-C items 1, 6) */
export async function CommunityRail({
  viewer,
  // INCOMING COLLEAGUE REQUESTS WS-C item 1). Computed by the
  incoming,
  // PASSED IN, NOT RE-FETCHED. The main column already read it; asking the
  mine,
}: {
  viewer: Viewer;
  mine: Awaited<ReturnType<typeof getMyCommunity>>;
  incoming: {
    connectionId: string;
    userId: string;
    name: string;
    title: string | null;
    photoUrl: string | null;
  }[];
}) {
  const teams = await getMyTeams(viewer);

  // OWNER vs MEMBER IS TWO DISJOINT FIELDS, NOT A ROLE. There is no `Team`
  const owns = teams.represents.length > 0;

  return (
    // and ONLY when somebody is actually waiting WS-C item 1).
    <aside className={"pm-cm-rail" + (incoming.length > 0 ? " pm-cm-rail-urgent" : "")}>
      {/* WAITING ON YOU — ABOVE MENTORS, AND FIRST ON A PHONE */}
      <WaitingOnYou rows={incoming} />

      {/* RULING 49b — THE RAIL IS THREE CARDS, IN THIS ORDER */}

      {/* ── YOUR TEAMS — RECRUITERS ONLY. ABSENT WHEN NOT YOURS. ─────── */}
      {/* R1: Teams are off. */}
      {false && owns && (
        <section className="pm-cm-panel">
          <h2>Your Teams</h2>
          {teams.represents.slice(0, 5).map((m) => (
            <div key={m.profileId} className="pm-cm-row">
              <Face photoUrl={m.photoUrl} size={30} />
              <div className="min-w-0">
                <p className="pm-cm-name">{m.name}</p>
                {m.headline && <p className="pm-cm-title">{m.headline}</p>}
              </div>
            </div>
          ))}
          {/* CAPPED AT FIVE WITH A LINK OUT — a recruiter roster can be forty */}
          <p className="pm-cm-count mt-2">
            <Link href="/connect/community" className="font-semibold text-magenta hover:underline">
              {teams.represents.length > 5
                ? `See All ${teams.represents.length} Members`
                : "Manage Roster"}
            </Link>
          </p>
        </section>
      )}

      {/* ── TEAMS YOU'RE ON ───────────────────────────────────────────────── */}
      <section className="pm-cm-panel">
        <h2>Teams You&rsquo;re On</h2>
        {teams.representedBy ? (
          <>
            <div className="pm-cm-row">
              <Face photoUrl={teams.representedBy.photoUrl} size={36} />
              <div className="min-w-0">
                <p className="pm-cm-name">{teams.representedBy.name}</p>
                {teams.representedBy.title && (
                  <p className="pm-cm-title">{teams.representedBy.title}</p>
                )}
              </div>
            </div>
            <p className="pm-cm-count mt-2">
              <Link href="/connect/community" className="font-semibold text-magenta hover:underline">
                View Team
              </Link>
            </p>
          </>
        ) : (
          /* A GENUINE ZERO, SAID PLAINLY — no promise, no date (ruling 18). */
          <p className="pm-cm-empty">
            You&rsquo;re not on a team.{" "}
            <Link href="/connect/community" className="font-semibold text-magenta hover:underline">
              See How Teams Work
            </Link>
            .
          </p>
        )}
      </section>


      {/* ── MENTORS ───────────────────────────────────────────────────────── */}
      <section className="pm-cm-panel">
        <h2>Mentors</h2>
        {mine.following.length === 0 ? (
          // ONE LINE AND ONE NEXT STEP — never an empty bordered box, which
          <p className="pm-cm-note">
            You&rsquo;re not following anyone yet.{" "}
            <Link href="/connect/mentors" className="font-semibold text-magenta hover:underline">
              Browse Mentors
            </Link>
            .
          </p>
        ) : (
          <>
            {mine.following.slice(0, 4).map((f) => (
              <div key={f.connectionId} className="pm-cm-row">
                <Face photoUrl={f.person!.photoUrl} size={30} />
                <div className="min-w-0">
                  <p className="pm-cm-name">{f.person!.name}</p>
                  {/* Their own title, verbatim (`E568`). */}
                  {f.person!.title && <p className="pm-cm-title">{f.person!.title}</p>}
                </div>
              </div>
            ))}
            {/* THE LINK IS UNCONDITIONAL NOW WS-A) */}
            <p className="pm-cm-count">
              <Link href="/connect/mentors" className="font-semibold text-magenta hover:underline">
                {mine.following.length > 4 ? `See All ${mine.following.length}` : "Browse Mentors"}
              </Link>
            </p>
          </>
        )}
        {/* HIDDEN AT ZERO, ON `getMyCommunity`'s OWN INSTRUCTION. "0 people */}
        {mine.mentorConnectionCount > 0 && (
          <p className="pm-cm-count mt-2">
            {mine.mentorConnectionCount} follow you as a mentor
          </p>
        )}
      </section>
    </aside>
  );
}
