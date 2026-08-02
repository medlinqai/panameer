import { prisma } from "@/lib/prisma";
import { TileRow, Listing, StubEmpty } from "@/components/console/ConsolePage";

export const dynamic = "force-dynamic";

/** Admin → Platform Admins (Support Data). Real: the admin bit is on User. */
export default async function Page() {
  const admins = await prisma.user.findMany({
    where: { is_system_admin: true },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      email: true,
      created_at: true,
      // Person is a 1:1 back-relation on User named `person` in the schema…
      person: { select: { first_name: true, last_name: true, title: true } },
    },
  });

  return (
    <div className="mx-auto w-full max-w-6xl">
      <TileRow
        tiles={[
          { label: "Platform Admins", value: admins.length, hint: "System administrators" },
          { label: "Support Staff", hint: "Needs a support role" },
          { label: "Pending Invites", hint: "No invite flow yet" },
        ]}
      />
      <Listing
        title="Platform Admins"
        columns={["Name", "Email", "Title", "Since"]}
        rows={admins.map((a) => [
          `${a.person?.first_name ?? ""} ${a.person?.last_name ?? ""}`.trim() || "(unnamed)",
          a.email,
          a.person?.title ?? "—",
          a.created_at.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        ])}
        empty={<StubEmpty what="platform admins" why="No user carries the system-admin flag." />}
      />
    </div>
  );
}
