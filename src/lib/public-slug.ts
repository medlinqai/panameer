import { prisma } from "@/lib/prisma";

/**
 * ── ⚠⚠ THE PERSONAL PUBLIC URL — `/in/<slug>` (`P2-A1.1-E738`) ────────────
 *
 * ⚠ SCOTT, 2026-10-01: *"`/in/<first>-<last>`, `-2`, `-3` on collisions. Stored
 * once; stable when the name changes unless the member edits it; old slugs
 * redirect."* The purpose he gave: **his own email signature.**
 *
 * ⚠⚠⚠ **"STORED ONCE" IS THE LOAD-BEARING WORD.** The slug is minted on demand
 * and then left alone. ⚠ It is deliberately NOT re-derived from the name on
 * save, because a URL in somebody's email signature that changes when they fix a
 * typo in their surname is a broken link they put there themselves — and they
 * will not know it broke.
 *
 * ⚠⚠ EVERY SLUG LIVES IN `ProviderProfileSlug`, live and retired in ONE unique
 * namespace. See that model's comment for why the live one is not a column.
 */

/**
 * ⚠⚠ `"Scott"`, `"Walls"` → `"scott-walls"`.
 *
 * ⚠ ASCII-folded and lower-cased: a URL somebody types from a business card has
 * to be reachable from any keyboard. ⚠⚠ `Steenkamp` and `Hernández` must not
 * produce a slug a US keyboard cannot enter, so diacritics are stripped rather
 * than percent-encoded.
 */
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

/**
 * ⚠⚠ Reserved first segments. ⚠⚠⚠ **A MEMBER MUST NOT BE ABLE TO MINT A SLUG
 * THAT SHADOWS A REAL PATH** — `/in/login` would be harmless today because the
 * route is `/in/[slug]`, but these are also the words a person reads as a
 * system page, and a provider called "Admin" presenting `/in/admin` is a
 * phishing surface we would have built ourselves.
 */
const RESERVED = new Set([
  "admin", "api", "login", "logout", "join", "signup", "sign-up", "settings",
  "profile", "providers", "explore", "learn", "shop", "work", "talent", "in",
  "me", "new", "edit", "search", "support", "help", "about", "panameer",
]);

/**
 * ⚠⚠ Find a free slug for `base`, trying `base`, `base-2`, `base-3`, …
 *
 * ⚠⚠⚠ **IT CHECKS THE WHOLE TABLE, WHICH IS WHY LIVE AND RETIRED SLUGS SHARE
 * ONE.** A retired slug is still reachable (it redirects), so handing it to a
 * different member would silently point an old email-signature link at a
 * stranger's profile.
 * ⚠ The `@unique` on `slug` is the real guarantee; this loop just avoids making
 * the database reject us. A race is still possible and is handled by the caller
 * retrying on a unique violation.
 */
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
  /* ⚠ 200 members with one name is not a case worth a prettier answer; a
     random suffix is still a working, unique URL. */
  return `${safe}-${Math.random().toString(36).slice(2, 8)}`;
}

/** ⚠ The member's live slug, or null if they have never had one. */
export async function currentSlug(profileId: string): Promise<string | null> {
  const row = await prisma.providerProfileSlug.findFirst({
    where: { profile_id: profileId, is_current: true },
    select: { slug: true },
    orderBy: { created_at: "desc" },
  });
  return row?.slug ?? null;
}

/**
 * ⚠⚠ The member's live slug, minting one from their name if they have none.
 *
 * ⚠ Called when a member first needs a public URL — i.e. when the Visibility
 * card renders their "Your public link" row. ⚠⚠ Minting on READ is safe
 * because the slug alone grants nothing: `/in/<slug>` serves the MASKED preview
 * unless `public_name_at` is set, and that is a separate, explicit opt-in.
 */
export async function ensureSlug(profileId: string): Promise<string | null> {
  const existing = await currentSlug(profileId);
  if (existing) return existing;

  const profile = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: { person: { select: { first_name: true, last_name: true } } },
  });
  if (!profile) return null;
  const base = slugifyName(profile.person.first_name, profile.person.last_name);
  /* ⚠ A member with no usable name yet gets no slug rather than a slug like
     `-2`. The Visibility card then shows nothing, which is honest. */
  if (!base) return null;

  const slug = await freeSlug(base);
  try {
    await prisma.providerProfileSlug.create({
      data: { slug, profile_id: profileId, is_current: true },
    });
    return slug;
  } catch {
    /* ⚠⚠ A UNIQUE VIOLATION HERE MEANS A CONCURRENT MINT WON — so re-read
       rather than retry the loop. ⚠ Returning null would make the card flicker
       empty for a member who now HAS a slug. */
    return currentSlug(profileId);
  }
}

/**
 * ⚠⚠ The member edits their URL. The old slug is RETIRED, not deleted.
 *
 * ⚠⚠⚠ **RETIRING RATHER THAN DELETING IS THE WHOLE REASON THE TABLE EXISTS.**
 * A deleted slug 404s every link already in the wild AND frees the name for
 * somebody else. ⚠ Retired rows keep `@unique` doing its job and let
 * `/in/<old>` issue a 308.
 *
 * ⚠ Returns the new slug, or null when `wanted` is unusable.
 */
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
  /* ⚠ Their OWN live slug is not "taken" — re-submitting the form unchanged
     must not be an error. */
  if (taken && taken.profile_id !== profileId) return { error: "taken" };
  if (taken && taken.profile_id === profileId && taken.is_current) {
    return { slug: base };
  }

  /* ⚠⚠ ONE TRANSACTION: retire every current row, then add the new one. Two
     statements outside a transaction can leave a member with two live slugs or
     none, and `check:public-profile` asserts exactly that invariant. */
  await prisma.$transaction(async (tx) => {
    await tx.providerProfileSlug.updateMany({
      where: { profile_id: profileId, is_current: true },
      data: { is_current: false },
    });
    /* ⚠ A row they once held and retired can be revived rather than duplicated
       — the `@unique` would refuse a second row with the same slug. */
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

/**
 * ⚠⚠ Resolve an incoming `/in/<slug>`.
 *
 * ⚠ Three outcomes, and the caller must treat them differently:
 *   · `{ profileId, canonical: true }`  → render
 *   · `{ profileId, canonical: false, slug }` → **308 to the live slug**
 *   · `null` → the "not available" page
 */
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
