import { prisma } from "@/lib/prisma";

export function slugifyName(first: string | null, last: string | null): string {
  const raw = `${first ?? ""} ${last ?? ""}`.trim();
  const folded = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return folded;
}

/** Reserved first segments. A MEMBER MUST NOT BE ABLE TO MINT A SLUG */
const RESERVED = new Set([
  "admin", "api", "login", "logout", "join", "signup", "sign-up", "settings",
  "profile", "providers", "explore", "learn", "shop", "work", "talent", "in",
  "me", "new", "edit", "search", "support", "help", "about", "panameer",
]);

/** Find a free slug for `base`, trying `base`, `base-2`, `base-3`, … */
async function freeSlug(base: string): Promise<string> {
  const safe = RESERVED.has(base) ? `${base}-1` : base;
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? safe : `${safe}-${n}`;
    const taken = await prisma.providerProfileSlug.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  /* 200 members with one name is not a case worth a prettier answer; a
     random suffix is still a working, unique URL. */
  return `${safe}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The member's live slug, or null if they have never had one. */
export async function currentSlug(profileId: string): Promise<string | null> {
  const row = await prisma.providerProfileSlug.findFirst({
    where: { profile_id: profileId, is_current: true },
    select: { slug: true },
    orderBy: { created_at: "desc" },
  });
  return row?.slug ?? null;
}

/** The member's live slug, minting one from their name if they have none. */
export async function ensureSlug(profileId: string): Promise<string | null> {
  const existing = await currentSlug(profileId);
  if (existing) return existing;

  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: { person: { select: { first_name: true, last_name: true } } },
  });
  if (!profile) return null;
  const base = slugifyName(profile.person.first_name, profile.person.last_name);
  // A member with no usable name yet gets no slug rather than a slug like
  if (!base) return null;

  const slug = await freeSlug(base);
  try {
    await prisma.providerProfileSlug.create({
      data: { slug, profile_id: profileId, is_current: true },
    });
    return slug;
  } catch {
    // A UNIQUE VIOLATION HERE MEANS A CONCURRENT MINT WON — so re-read
    return currentSlug(profileId);
  }
}

/** The member edits their URL. The old slug is RETIRED, not deleted. */
export async function changeSlug(
  profileId: string,
  wanted: string
): Promise<{ slug: string } | { error: "invalid" | "taken" }> {
  const base = wanted
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length < 3 || base.length > 60) return { error: "invalid" };
  if (RESERVED.has(base)) return { error: "taken" };

  const taken = await prisma.providerProfileSlug.findUnique({
    where: { slug: base },
    select: { profile_id: true, is_current: true },
  });
  // Their OWN live slug is not "taken" — re-submitting the form unchanged
  if (taken && taken.profile_id !== profileId) return { error: "taken" };
  if (taken && taken.profile_id === profileId && taken.is_current) {
    return { slug: base };
  }

  // ONE TRANSACTION: retire every current row, then add the new one. Two
  await prisma.$transaction(async (tx) => {
    await tx.providerProfileSlug.updateMany({
      where: { profile_id: profileId, is_current: true },
      data: { is_current: false },
    });
    // A row they once held and retired can be revived rather than duplicated
    if (taken) {
      await tx.providerProfileSlug.update({
        where: { slug: base },
        data: { is_current: true },
      });
    } else {
      await tx.providerProfileSlug.create({
        data: { slug: base, profile_id: profileId, is_current: true },
      });
    }
  });
  return { slug: base };
}

/** Resolve an incoming `/in/<slug>`. */
export async function resolveSlug(
  slug: string
): Promise<{ profileId: string; canonical: boolean; current: string | null } | null> {
  const row = await prisma.providerProfileSlug.findUnique({
    where: { slug: slug.toLowerCase() },
    select: { profile_id: true, is_current: true },
  });
  if (!row) return null;
  return {
    profileId: row.profile_id,
    canonical: row.is_current,
    current: row.is_current ? slug.toLowerCase() : await currentSlug(row.profile_id),
  };
}
