"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/Card";
import { ProfileView } from "@/components/ProfileView";
import { useMe } from "@/components/MeProvider";
import type { PublicProviderProfile } from "@/lib/types";

function Skeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="h-40 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
      <div className="h-32 animate-pulse rounded-2xl bg-black/[0.06] dark:bg-white/[0.06]" />
    </div>
  );
}

export default function MyProfilePage() {
  const { me, loading: meLoading } = useMe();
  const providerId = me?.providerProfile?.id ?? null;

  const [profile, setProfile] = useState<PublicProviderProfile | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  useEffect(() => {
    if (!providerId) return;
    setState("loading");
    let alive = true;
    fetch(`/api/providers/${providerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((p: PublicProviderProfile) => {
        if (alive) {
          setProfile(p);
          setState("done");
        }
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [providerId]);

  if (meLoading || state === "loading") return <Skeleton />;

  if (me && !providerId) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-center">
          <h1 className="text-xl font-semibold">No provider profile yet</h1>
          <p className="mt-2 text-black/60 dark:text-white/60">
            You don&apos;t have a provider profile. Onboarding is coming soon.
          </p>
          <Link href="/dashboard" className="mt-4 inline-block underline">
            Back to dashboard
          </Link>
        </Card>
      </div>
    );
  }

  if (state === "error" || !profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="text-center">
          <p className="text-black/70 dark:text-white/70">
            We couldn&apos;t load your profile. Please refresh.
          </p>
        </Card>
      </div>
    );
  }

  return <ProfileView profile={profile} />;
}
