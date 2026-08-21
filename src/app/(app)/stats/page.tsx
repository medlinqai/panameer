import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { guardPage } from "@/lib/guard";
import { ownedProviderProfile } from "@/lib/access";
import { isMarketplaceVisible } from "@/lib/access";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import {
  NotTrackedYet,
  StatRow,
  StatTile,
  StatValue,
} from "@/components/console/StatTile";

/**
 * MY STATS (J2.4 WS-D / E010).
 *
 * Six tiles from the brief — 12-month earnings, Job Success Score, Proposals,
 * Profile metrics, Client relationships, Rising Talent — and NO Connects tile,
 * per the standing decision that Connects are removed everywhere.
 *
 * TWO OF THE SIX HAVE REAL DATA. Profile metrics reads the profile; Rising
 * Talent is derived from things the schema actually knows. The other four —
 * earnings, job success, proposals, client relationships — all depend on
 * contracts and payments, which are Phase 2 and have no models yet. Those
 * render `NotTrackedYet` rather than zeroes: a provider shown "Job Success 0%"
 * would reasonably think they had failed at something, and "$0 earned" is a
 * claim we have not earned the right to make.
 *
 * Server component. Every number here comes from one query on the viewer's own
 * profile, resolved through `ownedProviderProfile` — no id crosses the wire.
 */
export const metadata = { title: "My Stats · Panameer" };

export default async function MyStatsPage() {
  const viewer = await guardPage("canProvideServices");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: {
      completeness: true,
      status: true,
      paused_at: true,
      validation_status: true,
      rating: true,
      updated_at: true,
      created_at: true,
      onboarding_completed_at: true,
      _count: {
        select: {
          skills: true,
          employers: true,
          projects: true,
          packages: true,
        },
      },
    },
  });


  /* ⚠ COUNTED ON THE USER, NOT THE PROFILE (`P1-J3-E019`). A credential belongs to
     the person, so a seller's own stats include a `LEARN` credential they earned
     before they were a seller — which has no `provider_profile_id` at all. */
  const certificationCount = await prisma.certification.count({
    where: { user_id: viewer.userId },
  });

  if (!profile) {
    return (
      <p className="text-ink-2">
        This account has no provider profile, so there is nothing to measure yet.
      </p>
    );
  }

  const visible = isMarketplaceVisible({
    status: profile.status,
    completeness: profile.completeness,
    paused_at: profile.paused_at,
  });
  const validated = profile.validation_status === "VALIDATED";

  /*
    RISING TALENT, honestly derived. Upwork's version is an opaque badge; ours
    is stated as what it actually is — a checklist of the things that make a new
    provider findable, with the count shown. No score is invented, and the
    criteria are visible so the label can't feel arbitrary.
  */
  const risingCriteria = [
    { label: "Profile complete enough to be visible", met: profile.completeness >= VISIBILITY_THRESHOLD },
    { label: "Work history added", met: profile._count.employers > 0 },
    { label: "At least one service package listed", met: profile._count.packages > 0 },
    { label: "Identity validated by Panameer", met: validated },
  ];
  const risingMet = risingCriteria.filter((c) => c.met).length;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        How your profile is performing. Anything marked “—” isn&apos;t being
        counted yet — those tiles fill in once transactions go live on Panameer.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Earnings (12 Months)">
          <NotTrackedYet unlocks="you complete your first paid work order" />
        </StatTile>

        <StatTile label="Job Success Score">
          <NotTrackedYet unlocks="buyers rate completed work orders" />
        </StatTile>

        <StatTile label="Proposals">
          <NotTrackedYet unlocks="you start bidding on work requests" />
        </StatTile>

        <StatTile
          label="Profile Metrics"
          hint={`Visible to buyers at ${VISIBILITY_THRESHOLD}% complete.`}
        >
          <StatValue
            value={`${profile.completeness}%`}
            caption={
              visible
                ? "Complete — your profile is live in the marketplace"
                : `Complete — ${VISIBILITY_THRESHOLD - profile.completeness}% to go before buyers can find you`
            }
          />
          <div className="mt-4">
            <StatRow label="Skills" value={String(profile._count.skills)} />
            <StatRow label="Employers" value={String(profile._count.employers)} />
            <StatRow label="Projects" value={String(profile._count.projects)} />
            <StatRow label="Packages" value={String(profile._count.packages)} />
            <StatRow
              label="Certifications"
              value={String(certificationCount)}
            />
          </div>
        </StatTile>

        <StatTile label="Client Relationships">
          <NotTrackedYet unlocks="you work with your first buyer" />
        </StatTile>

        <StatTile
          label="Rising Talent"
          hint="Panameer's version is a checklist, not a secret score — these are the things that make a new provider findable."
        >
          <StatValue value={`${risingMet}/${risingCriteria.length}`} caption="Criteria met" />
          <ul className="mt-4 space-y-1.5">
            {risingCriteria.map((c) => (
              <li key={c.label} className="flex items-start gap-2 text-[13.5px]">
                <span
                  aria-hidden
                  className={
                    "mt-[3px] grid h-4 w-4 flex-none place-items-center rounded-full text-[10px] font-black text-white " +
                    (c.met ? "bg-emerald-500" : "bg-line")
                  }
                >
                  {c.met ? "✓" : ""}
                </span>
                <span className={c.met ? "text-ink-2" : ""}>{c.label}</span>
              </li>
            ))}
          </ul>
        </StatTile>
      </div>

      <p className="mt-6 text-[13px] text-ink-2">
        Something look wrong?{" "}
        <Link href="/profile" className="font-semibold text-magenta hover:underline">
          Check your profile
        </Link>
        .
      </p>
    </div>
  );
}
