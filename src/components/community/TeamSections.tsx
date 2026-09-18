import { Avatar } from "@/components/Avatar";
import "./member-row.css";

/**
 * ── ⚠⚠ THE TWO SECTION SETS (`P2-J3-E558` WS-D) ───────────────────────────
 *
 * ⚠⚠⚠ THEY ARE NOT AN EITHER/OR. 10 PEOPLE HOLD BOTH A COORDINATOR AND A
 * PROVIDER JOB (measured 2026-09-18; the brief said 8). ⚠ The caller gates
 * `canProvideServices` and `canCoordinate` INDEPENDENTLY with `hasCapability()`,
 * so a dual-role person sees BOTH sets in one render.
 * ⚠⚠ NEVER `roleWord()` — that is the one-word header badge and it is
 * single-valued on purpose. Gating on it would force an either/or that the data
 * says is wrong for 10 people.
 *
 * ⚠⚠ THE HEADINGS ARE SINGULAR. There is no `Team` model: the relationship is
 * `ProviderProfile.coordinator_person_id`, a NULLABLE FK, so a provider belongs
 * to at most ONE coordinator and a coordinator has ONE roster. ⚠ SUPERSEDED,
 * quoted not deleted (`E164`): *"`Teams You're On`"* and *"`Teams You Manage`"*
 * — plural headings label something the schema forbids.
 * ⚠ RENAME WHEN THE MODEL BECOMES ONE-TO-MANY, NOT BEFORE.
 *
 * ⚠ EVERYTHING HERE RENDERS EMPTY ON EVERY ACCOUNT TODAY — `CoordinatorInvite`
 * holds 0 rows and 0 providers have a coordinator. ⚠⚠ NOTHING WAS SEEDED to
 * make it demonstrable (`E564`).
 */

export type RosterRow = {
  key: string;
  name: string;
  headline: string | null;
  photoUrl: string | null;
  /** ⚠⚠ `Accepted` or `Awaiting` — "nobody is added silently", in both
   *  directions. The model already distinguishes the two states, so this is
   *  enforceable rather than aspirational. */
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
  /* ⚠ `E433` — a consent STATE is a fact, not an interactive thing, so neither
     value is magenta. `Awaiting` is not a warning either: nobody has done
     anything wrong, the person simply has not answered yet. */
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
    <div className="pm-member-row flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4">
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
        <h2 className="font-display text-[17px] font-bold">The team you&rsquo;re on</h2>
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
            {/*
              ⚠⚠ THE INVITATION CARRIES THE RECRUITER — NOT THE WORK.
              ⚠ SUPERSEDED (`E164`): *"An invitation carries the work — who the
              buyer is, the scope, the viewer's part."* `CoordinatorInvite` has
              NO relation to `WorkRequest`, and none was added: the roster is
              STANDING, not per-job. Accepting sets `coordinator_person_id`
              permanently — the schema says it *"ATTACHES THE provider"* — so
              being asked to trust the recruiter IS the transaction.
              ⚠⚠ THE PRINCIPLE SURVIVES ON THE RIGHT OBJECT: an invitation must
              not be blind. Who they are, how big the roster is, and what it
              covers is what you need to judge a STANDING commitment.
            */}
            {invites.map((i) => (
              <div key={i.id} className="rounded-brand border border-line bg-white p-4">
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
                {/* ⚠ `E433` — the roster size is a figure, so ink. */}
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
                  {/* ⚠⚠ SAYS WHAT ACCEPTING DOES, because it is STANDING and
                      permanent. A person agreeing to a lasting attachment should
                      be told it is lasting. */}
                  Accepting puts you on their roster until you leave it. It is not
                  tied to one job.
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Recruiters you know</h2>
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
        <h2 className="font-display text-[17px] font-bold">Your team</h2>
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
        <h2 className="font-display text-[17px] font-bold">Your team&rsquo;s coverage</h2>
        <div className="rounded-brand border border-line bg-white p-5">
          {/* ⚠⚠ THIS IS THE RECRUITER'S PROFILE, NOT A STATISTIC. A recruiter's
              skills roll up from their team the way a provider's roll up from
              their jobs — it is what they can field, stated as skills.
              ⚠ ROLLED UP THROUGH `shown-skills.ts`, so `E517`'s offer-side
              filter applies: this shows what the roster OFFERS, not everything
              its people hold. ⚠ `E433` — the list is facts, so ink. */}
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
        <h2 className="font-display text-[17px] font-bold">Open work you could field</h2>
        <div className="rounded-brand border border-line bg-white p-5">
          {/*
            ⚠⚠⚠ THE STATED REASON IS THE ACCURATE ONE, AND THAT MATTERS BECAUSE
            THE BRIEF'S ORIGINAL REASON WAS WRONG.
            ⚠ SUPERSEDED (`E164`): *"`Open Work You Could Field` will be empty —
            ZERO `WorkRequest` ROWS EXIST."* ⚠⚠ THERE ARE FOUR. `CLAUDE.md:231`
            already carried that correction and quoted the old line as
            superseded; the brief copied the superseded text out of the root
            context doc.
            ⚠ SO THE HONEST SENTENCE IS THE ONE BELOW: they exist, none is
            posted, and nothing connects a work request to a roster anyway.
            ⚠ NOTHING WAS SEEDED to make this demonstrable (`E564`).
          */}
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
