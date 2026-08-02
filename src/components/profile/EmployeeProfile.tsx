import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/Avatar";
import { EmployeeProfileForm } from "@/components/profile/EmployeeProfileForm";

/**
 * The PANAMEER EMPLOYEE profile (WS7, patterned after Medlinq's MEDLINQ_ADMIN).
 *
 * Deliberately short. An admin performing platform setup has no résumé, no
 * hourly rate, no skills and no work history in the marketplace sense — those
 * fields belong to someone selling services, and showing them to staff is what
 * made the Panameer Admin look like a mis-seeded provider (E004/E006).
 *
 * EDITABLE, which is the other half of E004: "My Profile" was read-only, so
 * the one person who most needs to fix their own name couldn't.
 */
export async function EmployeeProfile({ userId }: { userId: string }) {
  const person = await prisma.person.findUnique({
    where: { user_id: userId },
    select: {
      first_name: true,
      last_name: true,
      title: true,
      phone: true,
      photo_url: true,
      company: { select: { name: true } },
      user: { select: { email: true, is_system_admin: true } },
    },
  });

  if (!person) {
    return (
      <div className="mx-auto max-w-2xl rounded-brand border border-line bg-white p-8">
        <p className="text-[16px] font-bold">No profile record.</p>
        <p className="mt-2 text-[14.5px] text-ink-2">
          This login isn&apos;t linked to a Person yet.
        </p>
      </div>
    );
  }

  const name = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="rounded-brand border border-line bg-white p-6">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            firstName={person.first_name ?? ""}
            lastName={person.last_name ?? ""}
            photoUrl={person.photo_url}
            size={84}
          />
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
              {name || "Unnamed"}
            </h1>
            <p className="mt-0.5 text-[15px] text-ink-2">
              {person.title ?? "Panameer"}
              {person.company?.name ? ` · ${person.company.name}` : ""}
            </p>
            {person.user?.is_system_admin && (
              <span className="mt-2 inline-block rounded-full bg-magenta/10 px-3 py-1 text-[12px] font-bold text-magenta">
                Panameer Admin
              </span>
            )}
          </div>
        </div>
      </div>

      <EmployeeProfileForm
        firstName={person.first_name ?? ""}
        lastName={person.last_name ?? ""}
        title={person.title ?? ""}
        phone={person.phone ?? ""}
        email={person.user?.email ?? ""}
        company={person.company?.name ?? ""}
        photoUrl={person.photo_url}
      />

      <p className="mt-4 text-[13px] text-ink-2">
        Panameer staff don&apos;t carry a résumé, rates, skills or work history —
        those belong to a provider profile.
      </p>
    </div>
  );
}
