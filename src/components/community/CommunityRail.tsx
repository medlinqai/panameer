import Link from "next/link";
import { Face } from "@/components/community/Silhouette";
import { getMyTeams } from "@/lib/teams";
import type { getMyCommunity } from "@/lib/connections";
import type { Viewer } from "@/lib/access";

/**
 * ── ⚠⚠ THE RAIL — MENTORS AND TEAMS (`P2-J3-E591` WS-C items 1, 6) ────────
 *
 * ⚠ They are in the rail because they are **0–2 rows for almost everyone**, and
 * a full-width section holding one row reads as a half-built page.
 *
 * ⚠⚠ PROFILE COMPLETION IS NOT HERE AND MUST NOT BE ADDED (WS-C item 2).
 * Scott was explicit: its home is My Profile. ⚠ ONE SUMMARY OF COMPLETENESS,
 * ONE SURFACE — `E588` WS-A's ruling applied across pages, not only within one.
 * ⚠⚠⚠ `E590` OWNS THE RING AND `completeness.ts`. Neither is touched here.
 */
export async function CommunityRail({
  viewer,
  /* ⚠ PASSED IN, NOT RE-FETCHED. The main column already read it; asking the
     database the same question twice in one render is work nobody needs. */
  mine,
}: {
  viewer: Viewer;
  mine: Awaited<ReturnType<typeof getMyCommunity>>;
}) {
  const teams = await getMyTeams(viewer);

  /*
    ⚠⚠ OWNER vs MEMBER IS TWO DISJOINT FIELDS, NOT A ROLE. There is no `Team`
    model — a team is `ProviderProfile.coordinator_person_id` pointing at a
    Person. So `represents` non-empty means the viewer IS the coordinator, and
    `representedBy` non-null means somebody else coordinates them.
    ⚠ `isCoordinator` is the raw CAPABILITY FLAG and is deliberately NOT used as
    *"owns a team"* — `teams.ts` reads the roster by `coordinator_person_id`
    rather than by the flag, so the two can legitimately disagree.
  */
  const owns = teams.represents.length > 0;

  return (
    <aside className="pm-cm-rail">
      {/* ── MENTORS ───────────────────────────────────────────────────────── */}
      <section className="pm-cm-panel">
        <h2>Mentors</h2>
        {mine.following.length === 0 ? (
          /* ⚠ ONE LINE AND ONE NEXT STEP — never an empty bordered box, which
             reads as something that failed to load. */
          <p className="pm-cm-note">
            You&rsquo;re not following anyone yet.{" "}
            <Link href="/community/mentors" className="font-semibold text-magenta hover:underline">
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
                  {/* ⚠ Their own title, verbatim (`E568`). */}
                  {f.person!.title && <p className="pm-cm-title">{f.person!.title}</p>}
                </div>
              </div>
            ))}
            {/*
              ── ⚠⚠⚠ THE LINK IS UNCONDITIONAL NOW (`P2-J3-E593` WS-A) ──────

              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   {mine.following.length > 4 && (
              //     <Link …>See All {mine.following.length}</Link>
              //   )}
              ⚠⚠ IT ONLY RENDERED ABOVE FOUR, SO FOLLOWING 1–4 HAD NO LINK TO
              `/community/mentors` AT ALL. That was survivable while `Mentoring`
              was its own tab. ⚠⚠⚠ `E593` REMOVES THAT TAB, so this link is now
              the ONLY door to that page from here — and a door that appears
              only above a threshold is not a door.
              ⚠ Found in CC's own `E591` WS-C work, at `E593`'s premise gate.
            */}
            <p className="pm-cm-count">
              <Link href="/community/mentors" className="font-semibold text-magenta hover:underline">
                {mine.following.length > 4 ? `See All ${mine.following.length}` : "Browse Mentors"}
              </Link>
            </p>
          </>
        )}
        {/* ⚠⚠ HIDDEN AT ZERO, ON `getMyCommunity`'s OWN INSTRUCTION. "0 people
            follow you" is a fabricated number in the `E433` family — it reports
            an absence as a measurement. */}
        {mine.mentorConnectionCount > 0 && (
          <p className="pm-cm-count mt-2">
            {mine.mentorConnectionCount} follow you as a mentor
          </p>
        )}
      </section>

      {/* ── TEAMS ─────────────────────────────────────────────────────────── */}
      <section className="pm-cm-panel">
        <h2>Teams</h2>

        {owns ? (
          /*
            ── ⚠ OWNER → A ROSTER, EVERY MEMBER NAMED (WS-C item 6) ─────────
            ⚠⚠ CAPPED IN THE RAIL WITH `See All N Members`, because a recruiter
            roster can be forty people and this is a 300px column.
          */
          <>
            {teams.represents.slice(0, 5).map((m) => (
              <div key={m.profileId} className="pm-cm-row">
                <Face photoUrl={m.photoUrl} size={30} />
                <div className="min-w-0">
                  <p className="pm-cm-name">{m.name}</p>
                  {m.headline && <p className="pm-cm-title">{m.headline}</p>}
                </div>
              </div>
            ))}
            <p className="pm-cm-count mt-2">
              <Link href="/community/teams" className="font-semibold text-magenta hover:underline">
                {teams.represents.length > 5
                  ? `See All ${teams.represents.length} Members`
                  : "Manage Roster"}
              </Link>
            </p>
          </>
        ) : teams.representedBy ? (
          /*
            ── ⚠⚠⚠ MEMBER → ONE TEAM, AND THE BRIEF ASKED FOR A GRAPHIC OF ALL
               OF THEM. THERE IS NO "ALL". ───────────────────────────────────

            ⚠ Scott: *"i probvably want one graphic to show all the teams i am a
            part of"*, and WS-C item 6 asks for the web with a node per team.
            ⚠⚠ **THE SCHEMA CANNOT EXPRESS MORE THAN ONE.** A team is
            `ProviderProfile.coordinator_person_id` — a SINGLE nullable foreign
            key on the provider's own row — so a provider is coordinated by at
            most one person, and `getMyTeams` returns `representedBy` as ONE
            object, not a list.
            ⚠⚠ PREMISE 6 BINDS HERE: *"BUILD ONLY WHAT `teams.ts` ALREADY
            RETURNS… REPORT what is missing instead."* ⚠ A web of one node is
            not a web; it is a card with extra steps. So this is a card, and the
            missing model is REPORTED at the gate rather than invented.
          */
          <>
            <div className="pm-cm-row">
              <Face photoUrl={teams.representedBy.photoUrl} size={36} />
              <div className="min-w-0">
                <p className="pm-cm-name">{teams.representedBy.name}</p>
                {teams.representedBy.title && (
                  <p className="pm-cm-title">{teams.representedBy.title}</p>
                )}
                <p className="pm-cm-count">Represents you</p>
              </div>
            </div>
            {/*
              ⚠⚠⚠ THIS LINK WAS MISSING ENTIRELY (`P2-J3-E593` WS-A). The owner
              branch above links and the no-team branch below links; ⚠ **a
              MEMBER of somebody else's team had no route to `/community/teams`
              at all.** Survivable while `Teams` was its own tab; `E593` removes
              that tab, so this is now the only door.
              ⚠ Found in CC's own `E591` WS-C work, at `E593`'s premise gate.
            */}
            <p className="pm-cm-count mt-2">
              <Link href="/community/teams" className="font-semibold text-magenta hover:underline">
                See Your Team
              </Link>
            </p>
          </>
        ) : (
          /*
            ⚠⚠ NO "CREATE A TEAM" PROMPT. Open question 2's recommendation, which
            Scott did not overturn: team creation is tied to the recruiter role,
            and whether a non-recruiter may own one is HIS call.
            ⚠⚠⚠ AN EMPTY CARD TEACHING A CAPABILITY THAT MAY NOT EXIST IS WORSE
            THAN NO CARD — so this states what a team IS and links to the tab
            that owns it, and offers nothing.
          */
          <p className="pm-cm-note">
            A team is a group of providers who take work together, so a buyer can
            hire the group rather than assemble one.{" "}
            <Link href="/community/teams" className="font-semibold text-magenta hover:underline">
              See How Teams Work
            </Link>
            .
          </p>
        )}
      </section>
    </aside>
  );
}
