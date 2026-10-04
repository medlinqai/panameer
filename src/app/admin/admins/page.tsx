import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admins = await prisma.user.findMany({
    where: { is_system_admin: true },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      email: true,
      person: { select: { first_name: true, last_name: true } },
    },
  });

  const input =
    "w-full rounded-[8px] border border-line px-3 py-2 text-[14px] outline-none focus:border-magenta disabled:bg-black/[0.02]";
  const btnOff =
    "cursor-not-allowed rounded-[8px] bg-magenta/30 px-5 py-2 text-[14px] font-bold text-white";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <section className="rounded-brand border border-line bg-white">
        <h2 className="border-b border-line px-6 py-4 font-display text-[17px] font-bold">
          Current Platform Admins
        </h2>
        <ul>
          {admins.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4 last:border-0"
            >
              <span className="min-w-0">
                <span className="block font-semibold">
                  {`${a.person?.first_name ?? ""} ${a.person?.last_name ?? ""}`.trim() ||
                    "(unnamed)"}
                </span>
                <span className="block text-[13px] text-ink-2">{a.email}</span>
              </span>
              <button
                type="button"
                disabled
                title="Revoking admin rights isn't wired yet"
                className="ml-auto cursor-not-allowed text-[13.5px] font-bold text-magenta/40"
              >
                Revoke
              </button>
            </li>
          ))}
          {admins.length === 0 && (
            <li className="px-6 py-8 text-center text-[14px] text-ink-2">
              No user carries the system-admin flag.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="font-display text-[17px] font-bold">Grant to an Existing User</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">
          The user must already have a Panameer login. Adds the platform-admin role.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <input disabled placeholder="user@example.com" className={input + " max-w-sm"} />
          <button type="button" disabled className={btnOff}>
            Grant
          </button>
        </div>
      </section>

      <section className="rounded-brand border border-line bg-white p-6">
        <h2 className="font-display text-[17px] font-bold">Invite a New Admin</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Creates a passwordless platform user and emails a set-password link (no
          secret is set here). They activate via the standard flow.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input disabled placeholder="First Name" className={input} />
          <input disabled placeholder="Last Name" className={input} />
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <input disabled placeholder="newadmin@example.com" className={input + " max-w-sm"} />
          <button type="button" disabled className={btnOff}>
            Invite
          </button>
        </div>
      </section>

      <p className="rounded-[10px] border border-dashed border-line px-4 py-3 text-[13px] text-ink-2">
        Grant, revoke and invite are <b>not wired</b>. Changing who holds
        platform-admin rights needs an audit trail and a confirmation step before
        it goes live — the list above is real, the controls are not.
      </p>
    </div>
  );
}
