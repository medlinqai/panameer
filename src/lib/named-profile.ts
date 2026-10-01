import { prisma } from "@/lib/prisma";
import {
  EMPLOYER_LOCK_COPY,
  getMaskedProfile,
  needlesFrom,
  scrub,
  yearRange,
  type MaskedProfile,
} from "@/lib/masked-profile";

/**
 * ── ⚠⚠⚠ "PUBLIC PROFILE WITH MY NAME" — THE OPT-IN VARIANT (`P2-A1.1-E738`) ─
 *
 * ⚠ SCOTT, 2026-10-01, the lane 4 addition: *"New Visibility option **"Public
 * profile with my name"**, off by default. On: name, photo, employers shown to
 * anyone, no sign-in; client names follow `clientNameVisibility`; rates and
 * contact need a free sign-up ("Join free to contact <first name>"); page may be
 * indexed. Off: `/in/<slug>` shows the masked preview."*
 *
 * ── ⚠⚠⚠ WHY THIS IS A SEPARATE READ AND **NOT A FLAG ON `MaskedProfile`** ───
 *
 * ⚠⚠ `MaskedProfile`'s whole value is that it HAS NO NAME FIELD — that is what
 * makes a leak impossible rather than merely unlikely. ⚠⚠⚠ **ADDING AN OPTIONAL
 * `firstName?: string` TO IT WOULD DESTROY EXACTLY THAT PROPERTY**: every
 * masked surface would then be one `{p.firstName}` away from a leak, and the
 * leak test would be the only thing standing in the way.
 * ⚠ So the named variant is `MaskedProfile` **plus** a separate object, and a
 * component that wants a name has to be handed one deliberately.
 *
 * ⚠⚠ **THE GATE IS READ HERE AND NOWHERE ELSE.** `public_name_at` is checked in
 * the query's `where`, so a profile that has not opted in returns `null` from
 * this function — not a masked object, not a partially-filled one. The caller
 * then falls back to `getMaskedProfile`, which is the only other shape.
 */

export type NamedExtras = {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  /**
   * ⚠⚠ Work history WITH employer names. ⚠ It replaces the masked employer
   * rows wholesale rather than filling a name into them, so a row can never be
   * half-named.
   */
  employers: {
    id: string;
    /** ⚠ Nullable because `Employer.name` is — an imported row can lack one. */
    name: string | null;
    roleTitle: string | null;
    dates: string | null;
    lines: { id: string; roleTitle: string | null; dates: string | null; industry: string | null }[];
  }[];
};

export type NamedProfile = MaskedProfile & { named: NamedExtras };

/**
 * ⚠⚠ The named profile, or `null` when this member has not opted in.
 *
 * ⚠⚠⚠ **`public_name_at: { not: null }` IS IN THE `where`, NOT IN AN `if`.** A
 * database predicate cannot be forgotten by a later edit to the mapping below;
 * an `if` can.
 */
export async function getNamedProfile(
  profileId: string
): Promise<NamedProfile | null> {
  /* ⚠ The masked read FIRST, because it also applies the eligibility rules
     (`visitorPreviewWhere`) — marketplace-visible, not paused, preview not
     switched off. ⚠⚠ Opting in to being NAMED must not let a paused profile
     become reachable, and sharing the base read is what guarantees it. */
  const base = await getMaskedProfile(profileId);
  if (!base) return null;

  const row = await prisma.providerProfile.findFirst({
    where: { id: profileId, public_name_at: { not: null } },
    select: {
      person: {
        select: { first_name: true, last_name: true, photo_url: true },
      },
      employers: {
        select: {
          id: true,
          name: true,
          role_title: true,
          start_date: true,
          end_date: true,
          is_current: true,
          projects: {
            select: {
              id: true,
              name: true,
              role_title: true,
              client_name: true,
              client_visibility: true,
              start_date: true,
              end_date: true,
              is_current: true,
              industry: { select: { name: true } },
            },
          },
        },
        orderBy: [{ is_current: "desc" }, { start_date: "desc" }],
      },
      projects: { select: { client_name: true } },
    },
  });
  /* ⚠ Not opted in → the caller renders the masked preview. */
  if (!row) return null;

  /*
    ── ⚠⚠⚠ THE NEEDLE SET IS **NARROWER** HERE, AND THAT IS THE POINT ────────

    ⚠ On the masked page, free text is scrubbed of the member's own name AND
    their employers AND their clients. ⚠⚠ Here the member has published their
    own name and their employers are shown, so scrubbing those would delete
    their summary for no reason.
    ⚠⚠⚠ **CLIENT NAMES ARE STILL SCRUBBED**, because Scott's answer routes them
    through `clientNameVisibility` — whose visitor arm withholds them even when
    a project is `PUBLIC` (a provider chose what MEMBERS may see, not what the
    open internet may). ⚠ So: own name in, employers in, clients out.
  */
  const clientNeedles = needlesFrom([
    ...row.employers.flatMap((e) => e.projects.map((pr) => pr.client_name)),
    ...row.projects.map((pr) => pr.client_name),
  ]);

  /* ⚠ The summary is re-scrubbed from the ORIGINAL text, not un-scrubbed from
     the masked one — `scrub` returns null, so there is nothing to recover. */
  const overview = await prisma.providerProfile.findUnique({
    where: { id: profileId },
    select: { overview: true },
  });

  return {
    ...base,
    summary: scrub(overview?.overview, clientNeedles),
    named: {
      firstName: row.person.first_name ?? "",
      lastName: row.person.last_name ?? "",
      photoUrl: row.person.photo_url,
      employers: row.employers.map((e) => ({
        id: e.id,
        name: e.name,
        roleTitle: scrub(e.role_title, clientNeedles),
        dates: yearRange(e.start_date, e.end_date, e.is_current),
        lines: e.projects.map((pr) => ({
          id: pr.id,
          roleTitle: scrub(pr.role_title ?? pr.name, clientNeedles),
          dates: yearRange(pr.start_date, pr.end_date, pr.is_current),
          industry: pr.industry?.name ?? null,
        })),
      })),
    },
  };
}

/** ⚠ Re-exported so the named view does not import the masked module too. */
export { EMPLOYER_LOCK_COPY };
