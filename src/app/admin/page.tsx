import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getAdminCompanies } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";

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
  const [companies, people, paths, lessons, providers] = await Promise.all([
    getAdminCompanies(viewer!),
    prisma.person.count(),
    prisma.learningPath.count({ where: { status: "PUBLISHED" } }),
    prisma.lesson.count(),
    prisma.providerProfile.count(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow
        tiles={[
          { label: "Companies", value: companies.length, hint: "On platform", href: "/admin/companies" },
          { label: "People", value: people, hint: "All actors" },
          { label: "Providers", value: providers, hint: "Provider profiles", href: "/admin/buyers-sellers" },
          { label: "Learning Paths", value: paths, hint: "Published", href: "/admin/learn" },
          { label: "Revenue (MTD)", hint: "Awaits billing" },
        ]}
      />

      <Listing
        title="Companies"
        columns={["Company", "Account Type", "Status", "People", "Joined"]}
        action={
          <Link
            href="/admin/companies"
            className="text-[13.5px] font-bold text-magenta hover:underline"
          >
            All companies →
          </Link>
        }
        rows={companies.slice(0, 12).map((c) => [
          <Link
            key={c.id}
            href={`/admin/companies/${c.id}`}
            className="font-semibold text-magenta hover:underline"
          >
            {c.company}
          </Link>,
          c.kind,
          <span
            key="s"
            className={
              "rounded-full px-2.5 py-0.5 text-[12px] font-bold " +
              (c.status === "ACTIVE"
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-black/[0.05] text-ink-2")
            }
          >
            {c.status}
          </span>,
          c.users.total,
          new Date(c.joinedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        ])}
        empty={
          <StubEmpty
            what="companies"
            why="No P-Accounts have been created yet. Companies appear here as buyers and providers sign up."
          />
        }
      />

      <VolumeFooter
        tiles={[
          { label: "Companies", value: companies.length },
          { label: "Providers", value: providers },
          { label: "Learning Paths", value: paths },
          { label: "Lessons", value: lessons },
          { label: "Work Requests" },
          { label: "Orders" },
          { label: "Contracts" },
          { label: "Revenue" },
        ]}
      />
    </div>
  );
}
