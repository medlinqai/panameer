import Link from "next/link";
import { getSessionViewer } from "@/lib/session";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";
import { Card } from "@/components/Card";
import { prisma } from "@/lib/prisma";
import { displayFirstName } from "@/lib/display";

/**
 * The provider's home (brief_S / E037).
 *
 * The rich Profile View REPLACES the old thin dashboard — the card that showed
 * a completeness meter plus View/Manage buttons. Landing on the actual profile
 * is both what Scott asked for and more useful: the provider sees what buyers
 * see, and the completeness/visibility story rides along in an owner-only
 * banner at the top of it.
 *
 * A buyer (or an account with no provider profile) still needs a home, so those
 * keep a lightweight surface below.
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

  const profile = await getOwnProviderProfileView(viewer.userId, viewer);
  if (profile) return <ProviderProfileViewPage p={profile} />;

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
