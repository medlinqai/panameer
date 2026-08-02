import { prisma } from "@/lib/prisma";
import { TileRow, Listing, VolumeFooter, StubEmpty } from "@/components/console/ConsolePage";

export const dynamic = "force-dynamic";

/**
 * Admin → Buyers/Sellers (E013).
 *
 * REAL DATA, unlike its neighbours: People and their actor flags exist, so this
 * page counts and lists them rather than stubbing. The footer breaks down by
 * DERIVED role exactly as the mockup asks — Requesters, Buyers, Coordinators,
 * Providers, Total — which is a straight read of the four boolean flags on
 * Person.
 *
 * "Requester" has no flag of its own yet (that distinction is the separate
 * USER_TYPE x JOB brief), so it reports as unknown rather than being folded
 * into Buyers, which would silently overstate one and erase the other.
 */
export default async function Page() {
  const [people, buyers, providers, coordinators, support] = await Promise.all([
    prisma.person.findMany({
      orderBy: { created_at: "desc" },
      take: 50,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        created_at: true,
        is_service_buyer: true,
        is_service_provider: true,
        is_service_coordinator: true,
        company: { select: { name: true } },
        user: { select: { email: true } },
      },
    }),
    prisma.person.count({ where: { is_service_buyer: true } }),
    prisma.person.count({ where: { is_service_provider: true } }),
    prisma.person.count({ where: { is_service_coordinator: true } }),
    prisma.person.count({ where: { is_support: true } }),
  ]);

  const total = await prisma.person.count();

  const roleOf = (p: (typeof people)[number]) =>
    [
      p.is_service_coordinator && "Recruiter",
      p.is_service_provider && "Provider",
      p.is_service_buyer && "Buyer",
    ]
      .filter(Boolean)
      .join(" · ") || "—";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow
        tiles={[
          { label: "Total People", value: total, hint: "All actors" },
          { label: "Providers", value: providers, hint: "Selling side" },
          { label: "Buyers", value: buyers, hint: "Buying side" },
          { label: "Recruiters", value: coordinators, hint: "Represent providers" },
          { label: "Awaiting Validation", hint: "Needs a review queue" },
        ]}
      />

      <Listing
        title="Buyers / Sellers"
        columns={["Person - Company", "Email", "Role", "Joined", "Status"]}
        rows={people.map((p) => [
          <span key="n">
            <span className="font-semibold">
              {`${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(unnamed)"}
            </span>
            {p.company?.name && (
              <span className="block text-[12.5px] text-ink-2">{p.company.name}</span>
            )}
          </span>,
          p.user?.email ?? "—",
          roleOf(p),
          p.created_at.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          "—",
        ])}
        empty={<StubEmpty what="people" why="Nobody has signed up yet." />}
      />

      <VolumeFooter
        tiles={[
          { label: "Service Requesters" },
          { label: "Buyers", value: buyers },
          { label: "Coordinators", value: coordinators },
          { label: "Providers", value: providers },
          { label: "Total", value: total },
        ]}
      />
      <p className="mt-3 text-[12.5px] text-ink-2">
        Service Requesters have no flag of their own yet — that distinction is
        the USER_TYPE × JOB model. Reported as unknown rather than folded into
        Buyers, which would overstate one and erase the other. Support accounts:{" "}
        {support}.
      </p>
    </div>
  );
}
