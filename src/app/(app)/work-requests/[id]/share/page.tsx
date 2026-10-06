import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { matchProvidersFor } from "@/lib/work-request-match";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";

export const metadata = { title: "Share your Work Request · Panameer" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login");
  const { id } = await params;

  const { skillIds, providers } = await matchProvidersFor(viewer, id);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-emerald-700">
        ✓ Your Work Request is live
      </p>
      <h1 className="mt-1 font-display text-[28px] font-bold tracking-[-0.5px]">
        Share it with providers
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        These providers claim the skills you asked for. Inviting one puts your
        request in front of them directly — anyone else can still find it and
        propose.
      </p>

      {providers.length === 0 ? (
        <div className="mt-7 rounded-brand border border-dashed border-line px-6 py-10 text-center">
          <p className="text-[16px] font-bold">
            No providers match these skills yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            {skillIds.length === 0
              ? "This request has no skills on it, so there is nothing to match against."
              : "Nobody marketplace-visible claims these skills today. Your request is live either way — providers can find it as they publish their profiles."}
          </p>
        </div>
      ) : (
        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {providers.map((p) => (
            <li
              key={p.profileId}
              className="rounded-brand border border-line bg-white p-5"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  firstName={p.firstName}
                  lastName={p.lastName}
                  photoUrl={p.photoUrl}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/providers/${p.profileId}`}
                    className="block truncate font-bold hover:text-magenta"
                  >
                    {p.name}
                  </Link>
                  {p.validated && (
                    <span className="text-[12.5px] font-semibold text-emerald-700">
                      ✓ Validated
                    </span>
                  )}
                </div>
              </div>

              {p.headline && (
                <p className="mt-2.5 line-clamp-2 text-[14px] leading-relaxed text-ink-2">
                  {p.headline}
                </p>
              )}

              <p className="mt-2.5 text-[13.5px] font-semibold text-magenta">
                {p.relevantSkills} relevant skill
                {p.relevantSkills === 1 ? "" : "s"}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                {p.matchedSkillNames.slice(0, 4).join(", ")}
              </p>

              {p.rateMinCents != null && (
                <p className="mt-2 text-[13.5px] text-ink-2">
                  {formatCents(p.rateMinCents, p.currency)}
                  {p.rateMaxCents && p.rateMaxCents !== p.rateMinCents
                    ? `–${formatCents(p.rateMaxCents, p.currency)}`
                    : ""}{" "}
                  / hr
                </p>
              )}

              {/* INVITE IS A STUB, AND IT SAYS SO. There is no work-invitation */}
              <Button
                href={`/work-requests/${id}/invite`}
                variant="ghost"
                className="mt-4 w-full"
              >
                Invite to propose
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-9 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button href="/dashboard">Done</Button>
        <Button href="/create-work" variant="quiet">
          Create another Work Request
        </Button>
      </div>
    </div>
  );
}
