import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { getMyTeams } from "@/lib/teams";
import { Avatar } from "@/components/Avatar";
import { relativeDay } from "@/lib/relative-day";

/**
 * MY TEAMS (PHASE 2 / WS2-D) — REAL, reading data that already existed.
 *
 * brief_I built the Service Coordinator model and `/coordinator` has been
 * rendering a roster off it. What was missing was anywhere for the OTHER side
 * to see it: a provider on somebody's roster had no way to know, and the
 * relationship only appeared in a console non-coordinators cannot open.
 *
 * So this reads both directions — who you represent, and who represents you —
 * and each half renders independently because a person can be both, one, or
 * neither. Nothing is fabricated: a person with no team sees an honest empty
 * state that says what a team is and how one starts.
 */
export const metadata = { title: "My Teams · Panameer" };

export default async function MyTeamsPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const teams = viewer
    ? await getMyTeams(viewer)
    : { represents: [], pendingInvites: [], representedBy: null, isCoordinator: false };

  const nothingAtAll =
    teams.represents.length === 0 &&
    teams.pendingInvites.length === 0 &&
    !teams.representedBy;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          My Teams
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          The providers you represent, and the recruiter who represents you.
        </p>
      </header>

      {nothingAtAll && (
        <section className="rounded-brand border border-dashed border-line px-5 py-8 text-center">
          <p className="text-[15px] font-semibold">You&apos;re not on a team yet.</p>
          <p className="mx-auto mt-1.5 max-w-lg text-[14px] leading-relaxed text-ink-2">
            A recruiter can represent several providers and bid on their behalf;
            a provider can be represented by one. Neither applies to you at the
            moment — if a recruiter invites you, accepting puts them here.
          </p>
          {teams.isCoordinator && (
            <Link
              href="/coordinator"
              className="mt-4 inline-block rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Invite A Provider
            </Link>
          )}
        </section>
      )}

      {/* ---- UP: who represents me --------------------------------------- */}
      {teams.representedBy && (
        <section className="rounded-brand border border-line bg-white p-5">
          <h2 className="font-display text-[16px] font-bold">
            Represented By
          </h2>
          <div className="mt-3 flex items-center gap-3">
            <Avatar
              firstName={teams.representedBy.name.split(" ")[0] ?? ""}
              lastName={teams.representedBy.name.split(" ").slice(1).join(" ")}
              photoUrl={teams.representedBy.photoUrl}
              size={40}
            />
            <div className="min-w-0">
              <p className="text-[15px] font-bold">{teams.representedBy.name}</p>
              <p className="text-[13px] text-ink-2">
                {teams.representedBy.title ?? "Recruiter"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
            They can put you forward for work. Your profile, rates and history
            stay yours — representation doesn&apos;t transfer ownership of
            anything.
          </p>
        </section>
      )}

      {/* ---- DOWN: who I represent --------------------------------------- */}
      {teams.represents.length > 0 && (
        <section className="rounded-brand border border-line bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-[16px] font-bold">
              Providers You Represent
            </h2>
            <Link
              href="/coordinator"
              className="text-[13.5px] font-semibold text-magenta hover:underline"
            >
              Manage roster →
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {teams.represents.map((m) => (
              <li key={m.profileId} className="flex items-center gap-3 py-3">
                <Avatar
                  firstName={m.name.split(" ")[0] ?? ""}
                  lastName={m.name.split(" ").slice(1).join(" ")}
                  photoUrl={m.photoUrl}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-bold">{m.name}</p>
                  <p className="truncate text-[13px] text-ink-2">
                    {m.headline || "No title yet"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {m.validated && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11.5px] font-bold text-emerald-800">
                      Validated
                    </span>
                  )}
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-[11.5px] font-bold " +
                      (m.visible
                        ? "bg-magenta/10 text-magenta"
                        : "bg-black/[0.06] text-ink-2")
                    }
                    title={
                      m.visible
                        ? "Live in the marketplace"
                        : `${m.completeness}% complete — not yet visible to buyers`
                    }
                  >
                    {m.visible ? "Live" : `${m.completeness}%`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- Pending invites --------------------------------------------- */}
      {teams.pendingInvites.length > 0 && (
        <section className="rounded-brand border border-line bg-white p-5">
          <h2 className="font-display text-[16px] font-bold">Invited, Not Yet Joined</h2>
          <ul className="mt-3 divide-y divide-line">
            {teams.pendingInvites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="text-[14px] font-semibold">
                  {i.name ?? i.email}
                </span>
                {i.name && <span className="text-[13px] text-ink-2">{i.email}</span>}
                <span className="ml-auto text-[13px] text-ink-2">
                  invited {relativeDay(i.invitedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
