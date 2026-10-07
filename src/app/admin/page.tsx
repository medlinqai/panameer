import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getAdminCompanies } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";
import { linkVolume } from "@/lib/admin-reports";
import { ParserHealth } from "@/components/console/ParserHealth";
import { MailHealth } from "@/components/console/MailHealth";
import { countTicketsAwaitingPanameer } from "@/lib/support";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const viewer = await getSessionViewer();
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [companies, newPeople, newLessons, ticketsWaiting] = await Promise.all([
    getAdminCompanies(viewer!),
    prisma.person.count({ where: { created_at: { gte: since } } }),
    prisma.lesson.count({ where: { created_at: { gte: since } } }),
    countTicketsAwaitingPanameer(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {}
      <TileRow
        tiles={[
          { label: "New Buyers/Sellers Last 30 Days", value: newPeople, hint: "Joined in the last 30 days" },
          { label: "New Lessons Last 30 Days", value: newLessons, hint: "Added in the last 30 days" },
          { label: "New Work Last 30 Days", hint: "Awaits work requests" },
          { label: "New Service Products Last 30 Days", hint: "Awaits service products" },
          {
            label: "Tickets Waiting on Us",
            value: ticketsWaiting,
            hint: "Open or in progress. Tickets waiting on the reporter are not counted.",
            href: "/admin/support",
          },
        ]}
      />

      <Listing
        title="New Contracts Last 30 Days"
        columns={["Time", "Buyer - Provider", "Role", "Status", "Start Date", "Message"]}
        empty={
          <StubEmpty
            what="contracts"
            why="Contracts are produced by the ordering flow, which is part of the transaction layer and not built."
          />
        }
      />

      {}
      <div className="mt-6">
        <ParserHealth />
      </div>

      {}
      <div className="mt-6">
        <MailHealth />
      </div>

      <VolumeFooter
        tiles={linkVolume([
          { label: "Work Requests" },
          { label: "Work Orders" },
          { label: "Contracts" },
          { label: "Settlement Requests" },
          { label: "Payments" },
        ])}
      />

      {}
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
