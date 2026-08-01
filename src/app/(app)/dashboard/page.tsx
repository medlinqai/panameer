import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { Opportunities } from "@/components/home/Opportunities";
import { Card } from "@/components/Card";
import { prisma } from "@/lib/prisma";
import { displayFirstName } from "@/lib/display";

/**
 * HOME — the Opportunities dashboard (MASTER WS12, design ref E151).
 *
 * This page used to render the provider's entire profile view, which is why the
 * post-publish landing was "mixing two pages" (E146): Home and my-profile were
 * the same endless scroll. They are now separate concerns —
 *
 *   Home     = go find work, go learn something          (here)
 *   Profile  = what buyers see, and Edit Profile         (/profile, /providers/[id])
 *   You're live = the one-time end-of-onboarding page    (/join/provider/live)
 *
 * A buyer, or an account with no provider profile, keeps the lightweight
 * surface below — Home for them is a different job and out of this brief.
 */
export default async function DashboardPage() {
  const viewer = await getSessionViewer();
  if (!viewer) {
    return (
      <Card>
        <p className="text-black/70 dark:text-white/70">
          Please{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>
          .
        </p>
      </Card>
    );
  }

  const isProvider = await prisma.providerProfile.findFirst({
    where: { person: { user_id: viewer.userId } },
    select: { id: true },
  });

  // WS12 — Home is the Opportunities dashboard. The Find-Work hero and the
  // Build-Skills row that used to live here moved to /work and /learn per the
  // brief's reconciliation, so Home is one job rather than three.
  if (isProvider) return <Opportunities />;

  // --- Not a provider: buyer / unfinished account ---------------------------
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: {
      first_name: true,
      company: { select: { name: true } },
      buyerProfile: { select: { subscription_tier: true } },
    },
  });

  const firstName = displayFirstName(person?.first_name ?? "");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl tracking-tight">
          Welcome Back{firstName ? `, ${firstName}` : ""}
        </h1>
        {person?.company?.name && (
          <p className="mt-1 text-black/60 dark:text-white/60">
            {person.company.name}
          </p>
        )}
      </header>

      {person?.buyerProfile ? (
        <Card>
          <h2 className="text-lg">Hire Talent</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Post a work request and match with validated experts across the
            enterprise-application catalog.
          </p>
          <Link
            href="/work/new"
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Create Work Request
          </Link>
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg">Get Started</h2>
          <p className="mt-2 text-black/70 dark:text-white/70">
            Your profile isn&apos;t set up yet. Build a provider profile to be
            found by service buyers.
          </p>
          <Link
            href="/join"
            className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Build My Profile
          </Link>
        </Card>
      )}
    </div>
  );
}
