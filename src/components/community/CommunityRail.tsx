import Link from "next/link";
import { Face } from "@/components/community/Silhouette";
import { getMyTeams } from "@/lib/teams";
import type { getMyCommunity } from "@/lib/connections";
import type { Viewer } from "@/lib/access";
import { WaitingOnYou } from "@/components/community/ColleagueCards";

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
  /* ⚠⚠ INCOMING COLLEAGUE REQUESTS (`P2-A3-E596` WS-C item 1). Computed by the
     page from the SAME `getMyCommunity` read the rail already receives — passed
     rather than re-derived, for the reason the `mine` prop records. */
  incoming,
  /* ⚠ PASSED IN, NOT RE-FETCHED. The main column already read it; asking the
     database the same question twice in one render is work nobody needs. */
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
    /*
      ⚠⚠ `pm-cm-rail-urgent` LIFTS THE RAIL ABOVE THE MAIN COLUMN ON A PHONE,
      and ONLY when somebody is actually waiting (`P2-A3-E596` WS-C item 1).
      ⚠ Measured: with the rail unconditionally first, a member with nothing
      pending met two empty-state panels before the web. The ordering follows
      the data, not the breakpoint.
    */
    <aside className={"pm-cm-rail" + (incoming.length > 0 ? " pm-cm-rail-urgent" : "")}>
      {/* ── ⚠⚠ WAITING ON YOU — ABOVE MENTORS, AND FIRST ON A PHONE ───────
          ⚠ `WaitingOnYou` RETURNS NULL ON AN EMPTY LIST, so the rail starts at
          Mentors for everybody with nothing pending. That is why it is mounted
          unconditionally here rather than wrapped in a check that would say the
          same thing twice. */}
      <WaitingOnYou rows={incoming} />

      {/*
        ── ⚠⚠⚠ RULING 49b — THE RAIL IS THREE CARDS, IN THIS ORDER ──────────

        ⚠ SCOTT, 2026-09-25: **Your Teams (RECRUITERS ONLY) · Teams You're On ·
        Mentors.** ⚠⚠ It had been ONE `Teams` card holding two different facts in
        two branches of a ternary — *the roster you run* and *the team you are
        on* — which are different objects with different audiences, and only
        looked like one card because both mention teams.

        ⚠⚠⚠ **`Your Teams` IS CAPABILITY-GATED AND THEREFORE ABSENT, NOT GREYED**
        (`E594`'s family, and ruling 49b says so in terms). ⚠ A greyed card tells
        a provider that running a roster is something they might one day press.
        It is not — it is what a RECRUITER does, and **absence is the honest
        rendering of "not yours."**

        ── ⚠⚠ WHAT WRITES EACH CARD, AS THE RULING REQUIRES ────────────────

        | card | the rows | the writer |
        |---|---|---|
        | Your Teams | `ProviderProfile` rows whose `coordinator_person_id` is me | ⚠ accepting a `CoordinatorInvite` |
        | Teams You're On | my own `ProviderProfile.coordinator` | ⚠ the same acceptance, read from the other side |
        | Mentors | `Connection` rows of kind `MENTOR` | `connections.ts` |

        ⚠⚠⚠ **ALL THREE HAVE A REAL WRITER, SO NONE RENDERS AS A DASH.** ⚠ Had
        one lacked a writer, ruling 49b's instruction was a dash AND ITS REASON,
        never an invented figure — so this was measured before it was built.

        ⚠⚠ **AND THERE IS NO `Team` MODEL AT ALL** — measured 2026-09-25. A
        "team" is `ProviderProfile.coordinator_person_id`, a single nullable
        foreign key on the provider's own row. ⚠⚠⚠ That is why `Teams You're On`
        shows **at most one**: the schema cannot express a second, so the
        mockup's web-of-teams graphic is **not buildable without a model that
        does not exist.** Reported, not invented.
      */}

      {/* ── YOUR TEAMS — ⚠⚠⚠ RECRUITERS ONLY. ABSENT WHEN NOT YOURS. ─────── */}
      {owns && (
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
          {/* ⚠⚠ CAPPED AT FIVE WITH A LINK OUT — a recruiter roster can be forty
              people and this is a 300px column. */}
          <p className="pm-cm-count mt-2">
            <Link href="/community/teams" className="font-semibold text-magenta hover:underline">
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
              <Link href="/community/teams" className="font-semibold text-magenta hover:underline">
                View Team
              </Link>
            </p>
          </>
        ) : (
          /* ⚠ A GENUINE ZERO, SAID PLAINLY — no promise, no date (ruling 18). */
          <p className="pm-cm-empty">
            You&rsquo;re not on a team.{" "}
            <Link href="/community/teams" className="font-semibold text-magenta hover:underline">
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
    </aside>
  );
}
