import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { getPublicProviderProfile } from "@/lib/providers";
import { getSessionViewer } from "@/lib/session";
import type { PublicProviderProfile } from "@/lib/types";

/**
 * Public provider profile — a marketplace surface. Not behind the auth gate;
 * renders server-side straight from the lib (still API-first: logic lives in
 * src/lib/providers). The lib enforces the visibility gate (brief_K), so a
 * hidden profile 404s — but the owner always sees their own.
 */
export default async function PublicProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getSessionViewer();
  // The lib returns Date objects; over HTTP they'd be ISO strings. ProfileView's
  // date formatter accepts both, so cast through unknown for the direct call.
  const raw = await getPublicProviderProfile(id, { viewerUserId: viewer?.userId });
  if (!raw) notFound();
  const profile = raw as unknown as PublicProviderProfile;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-background/80 backdrop-blur dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Panameer
          </Link>
          <Link
            href="/login"
            className="ml-auto text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <ProfileView profile={profile} />
      </main>
    </div>
  );
}
