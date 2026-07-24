"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { useMe } from "@/components/MeProvider";
import { roleLabels } from "@/lib/nav";
import { formatRate } from "@/lib/types";

function Skeleton() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-black/10 dark:bg-white/10" />
      <div className="h-40 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}

export default function DashboardPage() {
  const { me, loading, error } = useMe();

  if (loading) return <Skeleton />;

  if (error || !me) {
    return (
      <Card>
        <p className="text-black/70 dark:text-white/70">
          We couldn&apos;t load your account. Please refresh, or{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>{" "}
          again.
        </p>
      </Card>
    );
  }

  const { person, company, providerProfile, buyerProfile } = me;
  const roles = roleLabels(me);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {person.firstName}
        </h1>
        <p className="mt-1 text-black/60 dark:text-white/60">
          {company.name}
          {roles.length > 0 && <> · {roles.join(" · ")}</>}
        </p>
      </header>

      {providerProfile &&
        !providerProfile.published &&
        providerProfile.approvalStatus === "PENDING" && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-600/25 bg-amber-600/5 p-5">
            <span
              aria-hidden
              className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-amber-500 text-sm font-bold text-white"
            >
              ⏳
            </span>
            <div>
              <p className="font-semibold">Your profile is under review</p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Thanks for submitting! Our team is reviewing your provider
                profile. You&apos;ll be notified once it&apos;s approved and live
                on the marketplace.
              </p>
            </div>
          </div>
        )}

      <div className="grid gap-6 lg:grid-cols-2">
        {providerProfile && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your provider profile</h2>
              <div className="flex gap-2">
                <Badge tone={providerProfile.published ? "green" : "neutral"}>
                  {providerProfile.published ? "Published" : "Draft"}
                </Badge>
                <Badge
                  tone={
                    providerProfile.approvalStatus === "APPROVED"
                      ? "green"
                      : providerProfile.approvalStatus === "REJECTED"
                        ? "red"
                        : "amber"
                  }
                >
                  {providerProfile.approvalStatus.charAt(0) +
                    providerProfile.approvalStatus.slice(1).toLowerCase()}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  Rating
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {providerProfile.rating !== null
                    ? providerProfile.rating.toFixed(1)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  Remote
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {formatRate(
                    providerProfile.rates.remoteCents,
                    providerProfile.rates.currency
                  ) ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  Onsite
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {formatRate(
                    providerProfile.rates.onsiteCents,
                    providerProfile.rates.currency
                  ) ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                View my profile
              </Link>
              <Link
                href="/settings/profile"
                className="inline-flex rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
              >
                Manage profile
              </Link>
            </div>
          </Card>
        )}

        {buyerProfile && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hire talent</h2>
              <Badge tone="blue">
                {buyerProfile.subscriptionTier === "BUSINESS_PLUS"
                  ? "Business Plus"
                  : "Basic"}
              </Badge>
            </div>
            <p className="text-black/70 dark:text-white/70">
              Post a work request and match with vetted Oracle Cloud experts.
            </p>
            <Link
              href="/hire"
              className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create Work Request
            </Link>
          </Card>
        )}

        {!providerProfile && !buyerProfile && (
          <Card>
            <h2 className="text-lg font-semibold">Get started</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Your profile isn&apos;t set up yet. Onboarding is coming soon.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
