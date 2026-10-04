import { Avatar } from "@/components/Avatar";
import "./member-row.css";

export type RosterRow = {
  key: string;
  name: string;
  headline: string | null;
  photoUrl: string | null;
  consent: "accepted" | "awaiting";
};

export type IncomingInvite = {
  id: string;
  invitedAt: string;
  recruiter: { name: string; title: string | null; photoUrl: string | null };
  rosterSize: number;
  coverage: string[];
};

function ConsentPill({ consent }: { consent: RosterRow["consent"] }) {
  return (
    <span
      className={
        "shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-bold " +
        (consent === "accepted"
          ? "bg-black/[0.06] text-ink-2"
          : "border border-line text-ink-2")
      }
    >
      {consent === "accepted" ? "Accepted" : "Awaiting"}
    </span>
  );
}

function PersonLine({ row }: { row: RosterRow }) {
  return (
    <div className="pm-member-row flex flex-wrap items-center gap-3 border-t border-line py-5">
      <Avatar
        firstName={row.name.split(" ")[0] ?? ""}
        lastName={row.name.split(" ").slice(1).join(" ")}
        photoUrl={row.photoUrl}
        size={40}
      />
      <div className="min-w-[180px] flex-1">
        <p className="text-[15px] font-bold">{row.name}</p>
        {row.headline && <p className="text-[13px] text-ink-2">{row.headline}</p>}
      </div>
      <ConsentPill consent={row.consent} />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[14px] leading-relaxed text-ink-2">{children}</p>;
}

/* ── THE PROVIDER SET ─────────────────────────────────────────────────────── */
export function ProviderTeamSections({
  representedBy,
  invites,
  recruitersKnown,
}: {
  representedBy: { name: string; title: string | null; photoUrl: string | null } | null;
  invites: IncomingInvite[];
  recruitersKnown: { name: string; title: string | null; photoUrl: string | null }[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">The Team You&rsquo;re On</h2>
        {representedBy ? (
          <PersonLine
            row={{
              key: "rep",
              name: representedBy.name,
              headline: representedBy.title,
              photoUrl: representedBy.photoUrl,
              consent: "accepted",
            }}
          />
        ) : (
          <Empty>
            You are not on anyone&rsquo;s roster. A recruiter can invite you, and
            nothing happens until you accept.
          </Empty>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Invitations</h2>
        {invites.length === 0 ? (
          <Empty>No invitations.</Empty>
        ) : (
          <div className="space-y-2">
            {}
            {invites.map((i) => (
              <div key={i.id} className="border-t border-line py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Avatar
                    firstName={i.recruiter.name.split(" ")[0] ?? ""}
                    lastName={i.recruiter.name.split(" ").slice(1).join(" ")}
                    photoUrl={i.recruiter.photoUrl}
                    size={40}
                  />
                  <div className="min-w-[180px] flex-1">
                    <p className="text-[15px] font-bold">{i.recruiter.name}</p>
                    {i.recruiter.title && (
                      <p className="text-[13px] text-ink-2">{i.recruiter.title}</p>
                    )}
                  </div>
                  <ConsentPill consent="awaiting" />
                </div>
                {}
                <p className="mt-3 text-[13.5px] text-ink-2">
                  Roster of{" "}
                  <span className="font-bold text-ink">{i.rosterSize}</span>{" "}
                  {i.rosterSize === 1 ? "provider" : "providers"}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                  {i.coverage.length === 0 ? (
                    "Their roster lists no skills yet."
                  ) : (
                    <>
                      Covers: <span className="text-ink">{i.coverage.slice(0, 12).join(" · ")}</span>
                      {i.coverage.length > 12 ? " …" : ""}
                    </>
                  )}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                  {}
                  Accepting puts you on their roster until you leave it. It is not
                  tied to one job.
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Recruiters You Know</h2>
        {recruitersKnown.length === 0 ? (
          <Empty>None yet.</Empty>
        ) : (
          <div className="space-y-2">
            {recruitersKnown.map((r) => (
              <PersonLine
                key={r.name}
                row={{
                  key: r.name,
                  name: r.name,
                  headline: r.title,
                  photoUrl: r.photoUrl,
                  consent: "accepted",
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── THE RECRUITER SET ────────────────────────────────────────────────────── */
export function RecruiterTeamSections({
  roster,
  coverage,
}: {
  roster: RosterRow[];
  coverage: string[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Your Team</h2>
        {roster.length === 0 ? (
          <Empty>
            Nobody is on your roster yet. Invite a provider — they join only when
            they accept.
          </Empty>
        ) : (
          <div className="space-y-2">
            {roster.map((r) => (
              <PersonLine key={r.key} row={r} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Your Team&rsquo;s Coverage</h2>
        <div className="border-t border-line py-5">
          {}
          {coverage.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-ink-2">
              Nothing to cover yet. Coverage is the skills your roster offers, so
              it fills in as people accept.
            </p>
          ) : (
            <p className="text-[14px] leading-relaxed text-ink">
              {coverage.join(" · ")}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Open Work You Could Field</h2>
        <div className="border-t border-line py-5">
          {}
          <p className="text-[14px] leading-relaxed text-ink-2">
            Nothing here yet. Work requests exist but none has been posted — they
            are all still drafts — and a posted request is not yet routed to a
            recruiter&rsquo;s roster.
          </p>
        </div>
      </section>
    </div>
  );
}
