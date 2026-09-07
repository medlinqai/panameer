import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { InviteToBid } from "@/components/work/InviteToBid";
import { getWorkRequestDetail } from "@/lib/work-request-lines";
import { invitedOn } from "@/lib/work-request-invite";
import { matchProvidersFor } from "@/lib/work-request-match";
import { WorkRequestError } from "@/lib/work-request";

/**
 * Invite providers to bid (`P1-J4-E392` WS-3).
 *
 * ── ⚠⚠ THE STUB THIS REPLACES, AND WHY IT WAS RIGHT ─────────────────────────
 *
 * ⚠ SUPERSEDED, quoted not deleted: *"THERE IS NO WORK-INVITATION MODEL.
 * `CoordinatorInvite` is a recruiter asking to REPRESENT a provider — a
 * different relationship — and wiring this button to it would be fabrication by
 * mislabelling, which is worse than an honest 'not yet'."*
 *
 * **THAT WAS CORRECT AND IT IS NO LONGER TRUE.** `E395` landed `BidRequest` and
 * `BidRequestLine` on 2026-09-07, so the invitation has somewhere honest to
 * write. The brief made this work stream conditional on exactly that — *"if it
 * has not landed, leave the stub and say so"* — and it had.
 *
 * ⚠ THE OLD TODO POINTED AT `workRequestInviteTemplate`. THE EMAIL IS NOT SENT
 * HERE. Notifications for the sourcing documents are explicitly out of `E395`'s
 * scope and out of this brief's; the template is still built and still unfired,
 * and saying so is more useful than half-wiring it. REPORTED.
 */
export const metadata = { title: "Invite a Provider · Panameer" };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ line?: string }>;
}) {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  const { id } = await params;
  if (!viewer)
    redirect(`/login?callbackUrl=${encodeURIComponent(`/work-requests/${id}/invite`)}`);

  const transact = await checkTransact(viewer);
  if (!transact.ok) {
    redirect(
      `/company?blocked=${transact.reason}&from=${encodeURIComponent(`/work-requests/${id}/invite`)}`
    );
  }

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

  /* ⚠ Profile ids → person ids in one query. See the note on the detail page:
     `matchProvidersFor` is shared with `/share` and is not reshaped for this. */
  const profiles = await prisma.providerProfile.findMany({
    where: { id: { in: providers.map((p) => p.profileId) } },
    select: { id: true, person_id: true },
  });
  const personOf = new Map(profiles.map((p) => [p.id, p.person_id]));

  const options = providers
    .map((p) => ({
      personId: personOf.get(p.profileId) ?? "",
      profileId: p.profileId,
      firstName: p.firstName,
      lastName: p.lastName,
      name: p.name,
      headline: p.headline,
      photoUrl: p.photoUrl,
      validated: p.validated,
      relevantSkills: p.relevantSkills,
      matchedSkillNames: p.matchedSkillNames,
    }))
    .filter((p) => p.personId);

  const { line } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Link
        href={`/work-requests/${id}`}
        className="text-[13.5px] font-semibold text-ink-2 hover:text-magenta"
      >
        ← {detail.title.trim() || "Work Request"}
      </Link>
      <h1 className="mt-2 font-display text-[28px] font-bold tracking-[-0.5px]">
        Invite providers to bid
      </h1>
      <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
        Each provider you invite gets their own invitation to bid on one line, so
        you can compare like for like. Anyone else can still find the request and
        bid on it.
      </p>

      <div className="mt-7">
        <InviteToBid
          workRequestId={id}
          lines={detail.lines.map((l) => ({
            id: l.id,
            lineNumber: l.lineNumber,
            description: l.description,
            invitedCount: l.invitedCount,
          }))}
          providers={options}
          initialLineId={
            /* ⚠ VALIDATED AGAINST THIS REQUEST'S OWN LINES. A `?line=` from a
               stale link or another request must not preselect anything — the
               API would refuse it, and a form that starts on a value the server
               will reject is a trap. */
            line && detail.lines.some((l) => l.id === line) ? line : null
          }
          alreadyInvitedPersonIds={invited.map((i) => i.personId)}
        />
      </div>
    </div>
  );
}
