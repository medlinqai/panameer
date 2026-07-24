"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { useMe } from "@/components/MeProvider";
import { roleLabels } from "@/lib/nav";
import { formatRate } from "@/lib/types";

/**
 * "No access" banner shown when a role guard redirected the user here with
 * ?noaccess=1 (from the edge proxy or a server guard). Read from the URL in an
 * effect to avoid a Suspense boundary for useSearchParams on this static page.
 */
function NoAccessBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("noaccess")) {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-600/25 bg-amber-600/5 p-4">
      <span aria-hidden className="text-lg">
        🔒
      </span>
      <p className="text-sm text-black/70 dark:text-white/70">
        You don&apos;t have access to that area. If you think this is a mistake,
        your role may still be updating — try signing out and back in.
      </p>
    </div>
  );
}

/** Confirmation shown after a Work Request is posted (?posted=1, brief_L). */
function PostedBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("posted")) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-600/25 bg-emerald-600/5 p-4">
      <span aria-hidden className="text-lg">
        ✅
      </span>
      <p className="text-sm text-black/70 dark:text-white/70">
        Your work request is posted. Providers can be matched to it in a later
        release.
      </p>
    </div>
  );
}

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
      <NoAccessBanner />
      <PostedBanner />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome Back, {person.firstName}
        </h1>
        <p className="mt-1 text-black/60 dark:text-white/60">
          {company.name}
          {roles.length > 0 && <> · {roles.join(" · ")}</>}
        </p>
      </header>

      {providerProfile && providerProfile.paused && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-600/25 bg-amber-600/5 p-5">
          <span aria-hidden className="text-lg">
            ⏸
          </span>
          <div>
            <p className="font-semibold">Your Profile Is Paused</p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              You&apos;re hidden from the marketplace. Unpause anytime from{" "}
              <Link href="/settings/profile" className="underline">
                Settings
              </Link>
              .
            </p>
          </div>
        </div>
      )}
      {providerProfile &&
        !providerProfile.paused &&
        !providerProfile.visible && (
          <div className="flex items-start gap-3 rounded-2xl border border-magenta/25 bg-magenta/5 p-5">
            <span aria-hidden className="text-lg">
              ✨
            </span>
            <div>
              <p className="font-semibold">
                You&apos;re at {providerProfile.completeness}% — reach 80% to go
                live
              </p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                Panameer is a premium marketplace — the best buyers come here for
                the best talent. Complete your profile in{" "}
                <Link href="/settings/profile" className="underline">
                  Settings
                </Link>{" "}
                to become visible to service buyers.
              </p>
            </div>
          </div>
        )}

      <div className="grid gap-6 lg:grid-cols-2">
        {providerProfile && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Provider Profile</h2>
              <div className="flex gap-2">
                <Badge
                  tone={
                    providerProfile.paused
                      ? "amber"
                      : providerProfile.visible
                        ? "green"
                        : "neutral"
                  }
                >
                  {providerProfile.paused
                    ? "Paused"
                    : providerProfile.visible
                      ? "Live"
                      : "Not Visible"}
                </Badge>
                {providerProfile.validationStatus === "VALIDATED" && (
                  <Badge tone="green">✓ Validated</Badge>
                )}
                {providerProfile.validationStatus === "REQUESTED" && (
                  <Badge tone="amber">Validation Pending</Badge>
                )}
              </div>
            </div>

            {/* Completeness meter */}
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                <span>Profile Completeness</span>
                <span className="font-semibold">{providerProfile.completeness}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full bg-magenta transition-[width] duration-500"
                  style={{ width: `${Math.min(100, providerProfile.completeness)}%` }}
                />
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
                View My Profile
              </Link>
              <Link
                href="/settings/profile"
                className="inline-flex rounded-lg border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
              >
                Manage Profile
              </Link>
            </div>
          </Card>
        )}

        {buyerProfile && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Hire Talent</h2>
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
              href="/work/new"
              className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Create Work Request
            </Link>
          </Card>
        )}

        {!providerProfile && !buyerProfile && (
          <Card>
            <h2 className="text-lg font-semibold">Get Started</h2>
            <p className="mt-2 text-black/70 dark:text-white/70">
              Your profile isn&apos;t set up yet. Onboarding is coming soon.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
