import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getAdminCompanies } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";
import { linkVolume } from "@/lib/admin-reports";

export const dynamic = "force-dynamic";

/**
 * ADMIN HOME — the Panameer Dashboard (WS3, ported from Medlinq's /medlinq).
 *
 * COMPANIES FIRST: M1 is the paying clients, because that is what a platform
 * operator opens the console to look at. Medlinq's dashboard makes the same
 * choice with its Usage & Adoption table, and the reason carries over — the
 * company is the billing relationship, and everything else on the platform
 * hangs off one.
 *
 * WHAT IS REAL vs STUBBED, precisely:
 *   real     Companies, People, Learning Paths, Lessons, Providers — these have
 *            tables and are counted.
 *   stubbed  Work Requests, Orders, Packages, Contracts, Revenue — the
 *            transaction layer does not exist, so these render "—" rather than
 *            a zero. A zero is a claim that we looked and found none; a dash
 *            says we cannot look yet, which is the truth.
 */
export default async function AdminDashboardPage() {
  const viewer = await getSessionViewer();
  // "Last 30 days" is a real window over real tables for the two metrics that
  // have one; the other two tiles have no model to count.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [companies, newPeople, newLessons] = await Promise.all([
    getAdminCompanies(viewer!),
    prisma.person.count({ where: { created_at: { gte: since } } }),
    prisma.lesson.count({ where: { created_at: { gte: since } } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/*
        Deck slide 1. The MASTER's dashboard tiles were platform totals
        (Companies / People / Providers); the revised deck asks for NEW-IN-30-DAYS
        counters, which is a different question — "what changed" rather than
        "how big are we". Companies and Learning Paths are real counts; the
        other two need a transaction layer.
      */}
      <TileRow
        tiles={[
          { label: "New Buyers/Sellers Last 30 Days", value: newPeople, hint: "Joined in the last 30 days" },
          { label: "New Lessons Last 30 Days", value: newLessons, hint: "Added in the last 30 days" },
          { label: "New Work Last 30 Days", hint: "Awaits work requests" },
          { label: "New Packages Last 30 Days", hint: "Awaits packages" },
        ]}
      />

      <Listing
        title="New Contracts Last 30 Days"
        columns={["Time", "Requester - Provider", "Role", "Status", "Start Date", "Message"]}
        empty={
          <StubEmpty
            what="contracts"
            why="Contracts are produced by the ordering flow, which is part of the transaction layer and not built."
          />
        }
      />

      <VolumeFooter
        tiles={linkVolume([
          { label: "Work Requests" },
          { label: "Work Orders" },
          { label: "Contracts" },
          { label: "Settlement Requests" },
          { label: "Payments" },
        ])}
      />

      {/*
        Companies is still the operator's first question, and it is REAL data —
        kept below the deck's strip rather than dropped, because the deck
        replaced it with counters, not with nothing.
      */}
      <Listing
        title="Companies"
        columns={["Company", "Account Type", "Status", "People", "Joined"]}
        action={
          <Link href="/admin/companies" className="text-[13.5px] font-bold text-magenta hover:underline">
            All companies →
          </Link>
        }
        rows={companies.slice(0, 10).map((c) => [
          <Link key={c.id} href={`/admin/companies/${c.id}`} className="font-semibold text-magenta hover:underline">
            {c.company}
          </Link>,
          c.kind,
          <span
            key="s"
            className={
              "rounded-full px-2.5 py-0.5 text-[12px] font-bold " +
              (c.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700" : "bg-black/[0.05] text-ink-2")
            }
          >
            {c.status}
          </span>,
          c.users.total,
          new Date(c.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        ])}
        empty={<StubEmpty what="companies" why="No P-Accounts have been created yet." />}
      />
    </div>
  );
}
