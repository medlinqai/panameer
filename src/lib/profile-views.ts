import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { viewedTitle } from "@/lib/notification-events";

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function recordProfileView(opts: {
  profileId: string;
  viewerUserId: string | null | undefined;
  isOwner: boolean;
}): Promise<void> {
  if (opts.isOwner) return;
  if (!opts.viewerUserId) return;

  try {
    const person = await prisma.person.findFirst({
      where: { user_id: opts.viewerUserId },
      select: { id: true },
    });
    if (!person) return;

    const written = await prisma.profileView.createMany({
      data: [{ profile_id: opts.profileId, viewer_person_id: person.id, viewed_on: today() }],
      skipDuplicates: true,
    });

    if (written.count > 0) {
      const owner = await prisma.providerProfile.findUnique({
        where: { id: opts.profileId },
        select: { person_id: true },
      });
      if (owner) {
        // One bell row per profile per day; each new viewer bumps the count and makes it unread again.
        const day = today();
        const dedupeKey = `profile.viewed:${opts.profileId}:${day.toISOString().slice(0, 10)}`;
        const count = await prisma.profileView.count({ where: { profile_id: opts.profileId, viewed_on: day } });
        await notify({
          event: "profile.viewed",
          personId: owner.person_id,
          entityType: "provider_profile",
          entityId: opts.profileId,
          dedupeKey,
          vars: { count },
        });
        await prisma.notification.updateMany({
          where: { person_id: owner.person_id, dedupe_key: dedupeKey },
          data: { title: viewedTitle(count), read_at: null },
        });
      }
    }
  } catch {
    /* ⚠ Swallowed on purpose — see the note above. */
  }
}

/**
 * How many views this profile has — one per viewer per day, all time.
 *
 * ⚠⚠ NO TIME WINDOW, AND THAT IS THE `Counters` DECISION APPLIED RATHER THAN A
 * SHRUG. Scott, LOCKED: *"a real count of what is in the database, seeded rows
 * included, or a number Scott specifies. Count it and print it."* ⚠ A trailing
 * 30- or 90-day window is a product choice nobody has made, and picking one
 * here would put a number on a real person's profile that no ruling supports.
 * ⚠ The rows carry `viewed_on`, so a window can be added later without
 * re-recording anything — which is the half that genuinely cannot be retrofitted.
 */
export async function countProfileViews(profileId: string): Promise<number> {
  return prisma.profileView.count({ where: { profile_id: profileId } });
}
