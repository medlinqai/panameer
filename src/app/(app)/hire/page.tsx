import Link from "next/link";
import { redirect } from "next/navigation";
import { checkTransact, guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { Button } from "@/components/casing/Button";
import { formatCents } from "@/lib/display";
import { listWorkRequests, type WorkRequestRow } from "@/lib/hire";

/**
 * `/hire` — THE REQUESTER'S WORK REQUESTS (`P1-J4-E392` WS-1).
 *
 * ⚠⚠ THIS REPLACES A `ComingSoon` STUB, AND THE HOLE IT FILLS IS REAL: a
 * requester could create a work request and then had NOWHERE TO LOOK AT IT.
 * `/create-work` resumed the latest DRAFT and `/work-requests/[id]/share`
 * existed, but nothing listed what you had made — so a second request made the
 * first one unreachable.
 *
 * ⚠ THE HEADING IS "Work Requests", NOT "Hire". `E378`: *the rail says which
 * journey in one word, the tabs say which slice, and the page heading says the
 * journey's name.* `Hire` is the rail's verb, chosen because a verb picks a side;
 * the journey has always been Work Requests and `REQUESTER_NAV` already says so
 * in its `heading`.
 *
 * ⚠ COUNTS ARE REAL COUNTS OF WHAT IS IN THE DATABASE (the counters decision,
 * 2026-08-27). Zero requests renders an empty state that says zero, not a
 * seeded-looking number and not a hidden section.
 */
export const metadata = { title: "Work Requests · Panameer" };

function budgetLine(r: WorkRequestRow): string | null {
  if (r.budgetAmountCents != null)
    return `${formatCents(r.budgetAmountCents, r.currency)}${r.budgetType === "HOURLY" ? " / hr" : ""}`;
  if (r.budgetMinCents != null && r.budgetMaxCents != null)
    return `${formatCents(r.budgetMinCents, r.currency)}–${formatCents(r.budgetMaxCents, r.currency)}${
      r.budgetType === "HOURLY" ? " / hr" : ""
    }`;
  if (r.budgetMinCents != null) return `From ${formatCents(r.budgetMinCents, r.currency)}`;
  return null;
}

function dateLine(r: WorkRequestRow): string | null {
  if (r.startDate && r.endDate) return `${r.startDate} → ${r.endDate}`;
  if (r.startDate) return `From ${r.startDate}`;
  if (r.endDate) return `Until ${r.endDate}`;
  return null;
}

export default async function Page() {
  await guardPage("canHireTalent");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fhire");

  /*
    ⚠ THE COMPANY GATE, SAME AS `/create-work`. A work request commits a company,
    so a requester with no approved membership is sent to fix that rather than
    shown an empty list they can never add to. `from=` names where they were, so
    `/company` can send them back — `P1-J1.2-E004`.
  */
  const transact = await checkTransact(viewer);
  if (!transact.ok) {
    redirect(`/company?blocked=${transact.reason}&from=${encodeURIComponent("/hire")}`);
  }

  const requests = await listWorkRequests(viewer);
  const drafts = requests.filter((r) => r.status === "DRAFT").length;
  const posted = requests.filter((r) => r.status === "POSTED").length;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">
            Work Requests
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {requests.length === 0
              ? "You haven't created a work request yet."
              : `${requests.length} request${requests.length === 1 ? "" : "s"} · ${drafts} draft${
                  drafts === 1 ? "" : "s"
                } · ${posted} posted`}
          </p>
        </div>
        <Button href="/create-work">Create a Work Request</Button>
      </div>

      {requests.length === 0 ? (
        <div className="mt-8 rounded-brand border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[16px] font-bold">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            A work request describes what you need done. The wizard walks you
            through it in nine short steps and saves as you go, so you can stop
            and come back.
          </p>
          <Button href="/create-work" className="mt-6">
            Create your first Work Request
          </Button>
        </div>
      ) : (
        <ul className="mt-7 grid gap-3">
          {requests.map((r) => {
            const budget = budgetLine(r);
            const dates = dateLine(r);
            return (
              <li key={r.id} className="rounded-brand border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/work-requests/${r.id}`}
                      className="block truncate text-[16.5px] font-bold hover:text-magenta"
                    >
                      {r.title.trim() || "Untitled request"}
                    </Link>
                    <p className="mt-1 text-[13.5px] text-ink-2">
                      {r.lineCount} line{r.lineCount === 1 ? "" : "s"}
                      {r.providerNames.length > 0 && (
                        <> · {r.providerNames.join(", ")}</>
                      )}
                      {dates && <> · {dates}</>}
                      {budget && <> · {budget}</>}
                    </p>
                  </div>
                  <span
                    className={
                      r.status === "POSTED"
                        ? "rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-bold text-emerald-700"
                        : "rounded-full bg-ink/[0.05] px-3 py-1 text-[12.5px] font-bold text-ink-2"
                    }
                  >
                    {r.status === "POSTED" ? "Posted" : "Draft"}
                  </span>
                </div>

                {/*
                  ⚠ THE COMPLETE GATE, SAID OUT LOUD ON THE LIST TOO. It reads
                  `completenessFor` — the SAME function the detail page greys its
                  button with and the SAME one the API refuses with — so this row
                  and that button cannot disagree about which lines are short.
                */}
                <p className="mt-2.5 text-[13.5px]">
                  {r.completeness.complete ? (
                    <span className="font-semibold text-emerald-700">
                      ✓ Every line has a provider and a price
                    </span>
                  ) : r.completeness.reason === "NO_LINES" ? (
                    <span className="text-ink-2">No lines yet</span>
                  ) : (
                    <span className="text-amber-700">
                      {r.completeness.gaps.length} of {r.lineCount} line
                      {r.lineCount === 1 ? "" : "s"} still need
                      {r.completeness.gaps.length === 1 ? "s" : ""} a{" "}
                      {[...new Set(r.completeness.gaps.flatMap((g) => g.missing))].join(" or ")}
                    </span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
