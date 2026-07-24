import { prisma } from "@/lib/prisma";
import { requireAdmin, type Viewer } from "@/lib/access";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";

/**
 * Platform Console (brief_M) — admin, platform-wide reads + the merit Validation
 * grant/reject. Every function gates on `requireAdmin(viewer)` first (the
 * explicit admin path in access.ts — NOT a tenancy bypass), then queries across
 * all P-Accounts. Reads throw on failure so the UI fails loud (no silent empty).
 */

export class AdminError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "INVALID"
  ) {
    super(message);
    this.name = "AdminError";
  }
}

/** A short, stable display code derived from the PAccount id (no schema field). */
function shortCode(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function humanKind(kind: string): string {
  return kind === "BOTH" ? "Buyer & Provider" : kind.charAt(0) + kind.slice(1).toLowerCase();
}

/** Roles summary for a set of people. */
function countRoles(
  people: {
    is_service_buyer: boolean;
    is_service_provider: boolean;
    is_service_coordinator: boolean;
    is_support: boolean;
  }[]
) {
  return {
    total: people.length,
    buyers: people.filter((p) => p.is_service_buyer).length,
    providers: people.filter((p) => p.is_service_provider).length,
    coordinators: people.filter((p) => p.is_service_coordinator).length,
    support: people.filter((p) => p.is_support).length,
  };
}

// ---------------------------------------------------------------------------
// Dashboard — six stat tiles + Usage & Adoption.
// ---------------------------------------------------------------------------

export async function getAdminDashboard(viewer: Viewer) {
  requireAdmin(viewer);

  const [
    companies,
    providers,
    buyers,
    coordinators,
    workRequests,
    skills,
    accounts,
  ] = await Promise.all([
    prisma.pAccount.count(),
    prisma.person.count({ where: { is_service_provider: true } }),
    prisma.person.count({ where: { is_service_buyer: true } }),
    prisma.person.count({ where: { is_service_coordinator: true } }),
    prisma.workRequest.count(),
    prisma.skill.count(),
    prisma.pAccount.findMany({
      orderBy: { created_at: "desc" },
      include: {
        companies: {
          select: { name: true },
          orderBy: { created_at: "asc" },
          take: 1,
        },
      },
    }),
  ]);

  // Second pass for people/provider summary per PAccount (kept simple + explicit).
  const people = await prisma.person.findMany({
    select: {
      company: { select: { p_account_id: true } },
      is_service_buyer: true,
      is_service_provider: true,
      is_service_coordinator: true,
      is_support: true,
      providerProfile: {
        select: { status: true, completeness: true, validation_status: true },
      },
    },
  });
  const byAccount = new Map<string, typeof people>();
  for (const p of people) {
    const key = p.company.p_account_id;
    if (!byAccount.has(key)) byAccount.set(key, []);
    byAccount.get(key)!.push(p);
  }

  const usage = accounts.map((a) => {
    const ppl = byAccount.get(a.id) ?? [];
    const provs = ppl
      .map((p) => p.providerProfile)
      .filter((pp): pp is NonNullable<typeof pp> => pp != null);
    const validated = provs.filter((p) => p.validation_status === "VALIDATED").length;
    const live = provs.filter(
      (p) => p.status === "ACTIVE" && p.completeness >= VISIBILITY_THRESHOLD
    ).length;
    return {
      id: a.id,
      name: a.companies[0]?.name ?? a.name,
      kind: humanKind(a.kind),
      userCount: ppl.length,
      providerSummary:
        provs.length === 0
          ? "—"
          : `${provs.length} provider${provs.length === 1 ? "" : "s"} · ${live} live · ${validated} validated`,
      joinedAt: a.created_at.toISOString(),
    };
  });

  return {
    stats: { companies, providers, buyers, coordinators, workRequests, skills },
    usage,
  };
}

// ---------------------------------------------------------------------------
// Companies — roster + drill-in.
// ---------------------------------------------------------------------------

export async function getAdminCompanies(viewer: Viewer) {
  requireAdmin(viewer);

  const accounts = await prisma.pAccount.findMany({
    orderBy: { created_at: "desc" },
    include: {
      companies: {
        orderBy: { created_at: "asc" },
        include: {
          people: {
            select: {
              is_service_buyer: true,
              is_service_provider: true,
              is_service_coordinator: true,
              is_support: true,
            },
          },
        },
      },
    },
  });

  return accounts.map((a) => {
    const people = a.companies.flatMap((c) => c.people);
    return {
      id: a.id,
      company: a.companies[0]?.name ?? a.name,
      code: shortCode(a.id),
      kind: humanKind(a.kind),
      status: a.status,
      joinedAt: a.created_at.toISOString(),
      users: countRoles(people),
    };
  });
}

export async function getAdminCompany(viewer: Viewer, id: string) {
  requireAdmin(viewer);

  const account = await prisma.pAccount.findUnique({
    where: { id },
    include: {
      companies: {
        orderBy: { created_at: "asc" },
        include: {
          people: {
            orderBy: { created_at: "asc" },
            include: {
              user: { select: { email: true, email_verified: true } },
              providerProfile: {
                select: {
                  status: true,
                  completeness: true,
                  validation_status: true,
                  paused_at: true,
                },
              },
              buyerProfile: { select: { subscription_tier: true } },
            },
          },
        },
      },
    },
  });
  if (!account) throw new AdminError("Company not found", "NOT_FOUND");

  const people = account.companies.flatMap((c) => c.people);
  return {
    id: account.id,
    company: account.companies[0]?.name ?? account.name,
    code: shortCode(account.id),
    kind: humanKind(account.kind),
    status: account.status,
    joinedAt: account.created_at.toISOString(),
    users: countRoles(people),
    people: people.map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      title: p.title,
      email: p.user?.email ?? null,
      emailVerified: p.user?.email_verified != null,
      roles: {
        buyer: p.is_service_buyer,
        provider: p.is_service_provider,
        coordinator: p.is_service_coordinator,
        support: p.is_support,
      },
      provider: p.providerProfile
        ? {
            status: p.providerProfile.status,
            completeness: p.providerProfile.completeness,
            validationStatus: p.providerProfile.validation_status,
            paused: p.providerProfile.paused_at != null,
          }
        : null,
      buyer: p.buyerProfile
        ? { subscriptionTier: p.buyerProfile.subscription_tier }
        : null,
    })),
  };
}

// ---------------------------------------------------------------------------
// Providers — the validation workbench (4-stage funnel + table + actions).
// ---------------------------------------------------------------------------

export async function getAdminProviders(viewer: Viewer) {
  requireAdmin(viewer);

  const [invited, profiles] = await Promise.all([
    // Invited = open coordinator invite, no account yet.
    prisma.coordinatorInvite.count({ where: { status: "PENDING" } }),
    prisma.providerProfile.findMany({
      include: {
        person: {
          select: {
            first_name: true,
            last_name: true,
            company: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const registered = profiles.filter(
    (p) => p.completeness < VISIBILITY_THRESHOLD
  ).length;
  const eightyComplete = profiles.filter(
    (p) =>
      p.status === "ACTIVE" &&
      p.completeness >= VISIBILITY_THRESHOLD &&
      p.validation_status !== "VALIDATED"
  ).length;
  const validated = profiles.filter(
    (p) => p.validation_status === "VALIDATED"
  ).length;

  // REQUESTED first (they asked), then by most complete.
  const order = (s: string) =>
    s === "REQUESTED" ? 0 : s === "VALIDATED" ? 2 : 1;
  const rows = profiles
    .map((p) => ({
      id: p.id,
      name: `${p.person.first_name} ${p.person.last_name}`.trim(),
      company: p.person.company.name,
      status: p.status,
      completeness: p.completeness,
      validationStatus: p.validation_status,
      paused: p.paused_at != null,
      requestedAt: p.validation_requested_at
        ? p.validation_requested_at.toISOString()
        : null,
    }))
    .sort((a, b) => {
      const o = order(a.validationStatus) - order(b.validationStatus);
      return o !== 0 ? o : b.completeness - a.completeness;
    });

  return {
    stages: { invited, registered, eightyComplete, validated },
    providers: rows,
  };
}

/**
 * Grant validation (brief_M) — the real action brief_K stubbed. Sets
 * validation_status = VALIDATED + validated_at. Base marketplace visibility is
 * NOT touched (status/completeness/paused unchanged) — validation only adds the
 * badge / Premium eligibility (brief_K invariant).
 */
export async function validateProvider(viewer: Viewer, id: string) {
  requireAdmin(viewer);
  const existing = await prisma.providerProfile.findUnique({ where: { id } });
  if (!existing) throw new AdminError("Provider not found", "NOT_FOUND");
  await prisma.providerProfile.update({
    where: { id },
    data: { validation_status: "VALIDATED", validated_at: new Date() },
  });
  return { ok: true };
}

/** Reject validation → validation_status = REJECTED. Visibility unchanged. */
export async function rejectProvider(viewer: Viewer, id: string) {
  requireAdmin(viewer);
  const existing = await prisma.providerProfile.findUnique({ where: { id } });
  if (!existing) throw new AdminError("Provider not found", "NOT_FOUND");
  await prisma.providerProfile.update({
    where: { id },
    data: { validation_status: "REJECTED" },
  });
  return { ok: true };
}
