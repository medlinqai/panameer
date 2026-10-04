import Link from "next/link";
import { getMaskedProfile } from "@/lib/masked-profile";
import { browseAllowed } from "@/lib/public-browse-limit";
import { getPathsTaughtByProfile } from "@/lib/learn-home";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import {
  MaskedPreviewBar,
  MaskedProfileView,
} from "@/components/public/MaskedProfileView";
import { PublicPrimary, PublicSecondary } from "@/components/public/masked-ui";

export async function MaskedProviderPage({
  id,
  /** Where Join / Sign In should return to. Defaults to this profile. */
  backTo,
}: {
  id: string;
  backTo?: string;
}) {
  const allowed = await browseAllowed();
  const p = allowed ? await getMaskedProfile(id) : null;
  const dest = backTo ?? `/providers/${id}`;
  const joinHref = `/join?callbackUrl=${encodeURIComponent(dest)}`;
  const signInHref = `/login?callbackUrl=${encodeURIComponent(dest)}`;

  return (
    <div className="marketing-surface masked-surface flex min-h-screen flex-col bg-white font-body text-ink dark:bg-ink dark:text-white">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1120px] px-6 py-9 sm:py-12">
          {p ? (
            <>
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-2">
                <Link href="/explore" className="hover:text-magenta">
                  Browse Talent
                </Link>
              </p>
              <MaskedProfileView
                p={{ ...p, learnPaths: await taughtTitles(p.id) }}
                joinHref={joinHref}
                signInHref={signInHref}
              />
            </>
          ) : (
            /* ⚠ A throttled caller gets the PAUSE, not "not available" — the
               two are different facts and must not read the same. */
            allowed ? <NotAvailable joinHref={joinHref} /> : <TooFast />
          )}
        </div>
      </main>
      {p && <MaskedPreviewBar joinHref={joinHref} signInHref={signInHref} />}
      <MarketingFooter />
    </div>
  );
}

/**
 * ⚠ The Learn read lives here rather than in `getMaskedProfile`, which owns the
 * masking and should not also own the Learn join. ⚠⚠ Titles only — a learning
 * path's title names a SUBJECT, not a person, so nothing needs scrubbing.
 */
async function taughtTitles(profileId: string): Promise<string[]> {
  const paths = await getPathsTaughtByProfile(profileId);
  return paths.map((p) => p.title);
}

/**
 * ⚠⚠ "NOT AVAILABLE" — and it does not say why.
 * ⚠ It still offers a way forward (Browse Talent, Join Free) rather than being
 * a dead end: `E608`'s rule, *"no dead ends"*.
 */
function NotAvailable({ joinHref }: { joinHref: string }) {
  return (
    <div className="mx-auto max-w-[620px] py-10 text-center">
      <h1 className="text-[26px] font-bold">This profile isn&apos;t available</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        The link may be out of date, or this member may have chosen not to show a
        public preview. Browse the talent that is available, or join free to see
        full profiles.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <PublicPrimary href="/explore">Browse Talent</PublicPrimary>
        <PublicSecondary href={joinHref}>Join Free</PublicSecondary>
      </div>
    </div>
  );
}

/** ⚠ See `BrowseTalentGrid`'s twin: a pause, not an error, and no countdown. */
function TooFast() {
  return (
    <div className="mx-auto max-w-[620px] py-10 text-center">
      <h1 className="text-[24px] font-bold">One moment</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        That was a lot of requests in a short time. Give it a few seconds and
        reload.
      </p>
    </div>
  );
}
