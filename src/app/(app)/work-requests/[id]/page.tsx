import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import { WorkRequestLines } from "@/components/work/WorkRequestLines";
import { getWorkRequestDetail } from "@/lib/work-request-lines";
import { invitedOn } from "@/lib/work-request-invite";
import { matchProvidersFor } from "@/lib/work-request-match";
import { WorkRequestError } from "@/lib/work-request";

/**
 * `/work-requests/[id]` — THE DETAIL PAGE (`P1-J4-E392` WS-2).
 *
 * ⚠⚠ THIS PAGE DID NOT EXIST. A requester could create a work request and then
 * had nowhere to look at it — the wizard resumed the latest DRAFT and `/share`
 * listed matching providers, but the request itself was unviewable. That is the
 * hole, and lines are the reason it had to be filled: `E388` gave a work request
 * LINES, and lines need somewhere to live that is not a nine-step wizard.
 *
 * ⚠ THE WIZARD IS UNTOUCHED. It produces LINE 1; this page manages 2..n. See
 * `lib/work-request-lines.ts` for why that split rather than a rewrite.
 */
export const metadata = { title: "Work Request · Panameer" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer) redirect(`/login?callbackUrl=${encodeURIComponent(`/work-requests/${id}`)}`);

  const transact = await checkTransact(viewer);
  if (!transact.ok) {
    redirect(
      `/company?blocked=${transact.reason}&from=${encodeURIComponent(`/work-requests/${id}`)}`
    );
  }

  /*
    ⚠ A REQUEST THE VIEWER DOES NOT OWN IS A 404, NOT A 403. `loadOwned` is
    P-Account scoped, so "not yours" and "does not exist" are the same answer —
    and they should be: telling a stranger that an id EXISTS but belongs to
    someone else is itself a leak.
  */
  let detail;
  try {
    detail = await getWorkRequestDetail(viewer, id);
  } catch (e) {
    if (e instanceof WorkRequestError && (e.code === "NOT_FOUND" || e.code === "NOT_A_BUYER"))
      notFound();
    throw e;
  }

  const [{ providers }, invited] = await Promise.all([
    matchProvidersFor(viewer, id),
    invitedOn(viewer, id),
  ]);

  /*
    ⚠ THE PICKER NEEDS PERSON IDS AND `matchProvidersFor` RETURNS PROFILE IDS.
    Resolved in ONE query here rather than by changing that shared lib, which
    `/share` also reads — a signature change there to serve this page would be a
    change to a working surface for the convenience of a new one.
  */
  const profiles = await prisma.providerProfile.findMany({
    where: { id: { in: providers.map((p) => p.profileId) } },
    select: { id: true, person_id: true },
  });
  const personOf = new Map(profiles.map((p) => [p.id, p.person_id]));
  const options = providers
    .map((p) => ({
      personId: personOf.get(p.profileId) ?? "",
      name: p.name,
      headline: p.headline,
    }))
    .filter((p) => p.personId);

  const posted = detail.status === "POSTED";

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href="/hire"
        className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta"
      >
        ← Work Requests
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
            {detail.title.trim() || "Untitled request"}
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-2">
            {detail.roleName && <>{detail.roleName} · </>}
            {posted ? `Posted ${detail.postedAt?.slice(0, 10)}` : "Draft"}
          </p>
        </div>
        <span
          className={
            posted
              ? "rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-bold text-emerald-700"
              : "rounded-full bg-ink/[0.05] px-3 py-1 text-[12.5px] font-bold text-ink-2"
          }
        >
          {posted ? "Posted" : "Draft"}
        </span>
      </div>

      {/* ══ HEADER FACTS ═══════════════════════════════════════════════════ */}
      <dl className="mt-6 grid gap-x-8 gap-y-3.5 rounded-brand border border-line bg-white p-5 sm:grid-cols-3">
        <Fact label="Dates">
          {detail.startDate || detail.endDate
            ? `${detail.startDate ?? "…"} → ${detail.endDate ?? "…"}`
            : "Not set"}
        </Fact>
        <Fact label="Budget">
          {detail.budgetAmountCents != null
            ? `${formatCents(detail.budgetAmountCents, detail.currency)}${
                detail.budgetType === "HOURLY" ? " / hr" : ""
              }`
            : detail.budgetMinCents != null && detail.budgetMaxCents != null
              ? `${formatCents(detail.budgetMinCents, detail.currency)}–${formatCents(
                  detail.budgetMaxCents,
                  detail.currency
                )}${detail.budgetType === "HOURLY" ? " / hr" : ""}`
              : "Not set"}
        </Fact>
        <Fact label="Worksite">{detail.worksite ?? "Not set"}</Fact>
        <Fact label="Experience">{detail.experienceLevel ?? "Not set"}</Fact>
        <Fact label="Duration">{detail.duration ?? "Not set"}</Fact>
        <Fact label="Skills">
          {detail.skillNames.length ? detail.skillNames.slice(0, 6).join(", ") : "None"}
        </Fact>
      </dl>

      {detail.description && (
        <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">
          {detail.description}
        </p>
      )}

      {/*
        ⚠ POST LIVES HERE TOO, not only at the end of the wizard. A requester who
        left the wizard at step 8 and came back has a DRAFT and no obvious way to
        post it; `/create-work` resumes the LATEST draft, which is not necessarily
        this one. The route it calls is the existing `POST .../post`, unchanged —
        including its identity gate.
      */}
      {!posted && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">This request is still a draft</p>
            <p className="mt-0.5 text-[14px] text-ink-2">
              Posting makes it visible to providers looking for work.
            </p>
          </div>
          <Button href={`/create-work`} variant="ghost">
            Open in the wizard
          </Button>
        </div>
      )}

      <div className="mt-8">
        <WorkRequestLines initial={detail} providers={options} />
      </div>

      {/* ══ WHO HAS BEEN INVITED ═══════════════════════════════════════════
          ⚠⚠ THE INVITATIONS, NOT THE RESPONSES. `E392`'s fence: this brief
          creates invites and renders nothing that comes back. No bid rows, no
          statuses, no comparison — those are their own brief. */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[20px] font-bold tracking-[-0.3px]">
            Invited to bid <span className="font-normal text-ink-2">({invited.length})</span>
          </h2>
          <Button href={`/work-requests/${id}/invite`} variant="ghost">
            Invite providers
          </Button>
        </div>
        {invited.length === 0 ? (
          <p className="mt-3 text-[14.5px] text-ink-2">
            Nobody has been invited yet. Inviting a provider puts your request in
            front of them directly — anyone else can still find it and bid.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {invited.map((i) => (
              <li
                key={i.requestNumber}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-line bg-white px-4 py-3"
              >
                <span className="font-semibold">{i.name}</span>
                <span className="text-[13.5px] text-ink-2">
                  Line {i.lineNumber} · {i.requestNumber}
                  {i.respondsBy && <> · responds by {i.respondsBy}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-9 flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button href="/hire" variant="ghost">
          All Work Requests
        </Button>
        {posted && (
          <Button href={`/work-requests/${id}/share`} variant="quiet">
            Share it with providers
          </Button>
        )}
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] font-bold uppercase tracking-[0.08em] text-ink-2">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-[14.5px]">{children}</dd>
    </div>
  );
}
