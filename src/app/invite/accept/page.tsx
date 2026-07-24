import Link from "next/link";
import Image from "next/image";
import { lookupInvite } from "@/lib/coordinator";
import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AcceptButton } from "@/components/coordinator/AcceptButton";

/**
 * Coordinator invite accept landing (brief_I). PUBLIC (a new invitee has no
 * session). Validates the token, then routes by situation:
 *   - new email  → onboard via /join/provider (token carried through)
 *   - existing provider, logged in as the invitee → accept + link now
 *   - existing account, not logged in / wrong account → prompt to log in
 *   - expired / revoked / used / invalid → safe error, no side effects
 */
export default async function InviteAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const lookup = await lookupInvite(token ?? "");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-soft px-6 text-center font-body text-ink">
      <Link href="/" aria-label="Panameer home">
        <Image
          src="/brand/panameer-logo.png"
          alt="Panameer"
          width={786}
          height={111}
          priority
          className="h-9 w-auto"
        />
      </Link>

      <div className="mt-10 w-full max-w-md rounded-brand border border-line bg-white p-8 text-left shadow-brand">
        {!lookup.ok ? (
          <ErrorState reason={lookup.reason} />
        ) : (
          <ValidState token={token!} lookup={lookup} />
        )}
      </div>
    </div>
  );
}

function ErrorState({ reason }: { reason: "invalid" | "expired" | "revoked" | "used" }) {
  const copy: Record<string, { title: string; body: string }> = {
    expired: { title: "Invitation expired", body: "This invitation link has expired. Ask your coordinator to send a new one." },
    revoked: { title: "Invitation revoked", body: "This invitation is no longer valid. Ask your coordinator to send a new one." },
    used: { title: "Invitation already used", body: "This invitation has already been accepted." },
    invalid: { title: "Invalid invitation", body: "We couldn't find that invitation. Check the link or ask your coordinator to resend it." },
  };
  const c = copy[reason];
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-line text-2xl font-black text-ink-2">
        !
      </div>
      <h1 className="text-2xl font-extrabold tracking-[-0.5px]">{c.title}</h1>
      <p className="mt-2 text-ink-2">{c.body}</p>
      <Link href="/" className="mt-6 inline-block font-bold text-magenta">
        Go to Panameer
      </Link>
    </div>
  );
}

async function ValidState({
  token,
  lookup,
}: {
  token: string;
  lookup: Extract<Awaited<ReturnType<typeof lookupInvite>>, { ok: true }>;
}) {
  const header = (
    <>
      <h1 className="text-2xl font-extrabold tracking-[-0.5px]">
        You&apos;re invited
      </h1>
      <p className="mt-2 text-ink-2">
        <b>{lookup.coordinatorName}</b> invited you to join Panameer as a service
        provider.
      </p>
      {lookup.message && (
        <p className="mt-3 rounded-[12px] border-l-[3px] border-magenta bg-bg-soft px-4 py-3 text-[14px] italic text-ink-2">
          “{lookup.message}”
        </p>
      )}
    </>
  );

  // New user → onboard, carrying the token so acceptance links on completion.
  if (!lookup.accountExists) {
    return (
      <div>
        {header}
        <Link
          href={`/join/provider?invite=${encodeURIComponent(token)}`}
          className="mt-6 inline-flex rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Accept &amp; create your account
        </Link>
      </div>
    );
  }

  // Existing account — require the invitee to be logged in AS that account.
  const viewer = await getSessionViewer();
  const acceptUrl = `/invite/accept?token=${encodeURIComponent(token)}`;

  if (!viewer) {
    return (
      <div>
        {header}
        <p className="mt-4 text-[14px] text-ink-2">
          An account already exists for <b>{lookup.inviteeEmail}</b>. Log in as
          that account to accept.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(acceptUrl)}`}
          className="mt-4 inline-flex rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Log in to accept
        </Link>
      </div>
    );
  }

  const me = await prisma.user.findUnique({
    where: { id: viewer.userId },
    select: { email: true },
  });
  const isInvitee =
    me?.email?.toLowerCase() === lookup.inviteeEmail.toLowerCase();

  if (!isInvitee) {
    return (
      <div>
        {header}
        <p className="mt-4 text-[14px] text-ink-2">
          This invitation is for <b>{lookup.inviteeEmail}</b>, but you&apos;re
          signed in as a different account. Sign in as the invited account to
          accept.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(acceptUrl)}`}
          className="mt-4 inline-flex rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
        >
          Switch account
        </Link>
      </div>
    );
  }

  // Logged in as the invitee → accept + link now (server enforces provider).
  return (
    <div>
      {header}
      <div className="mt-6">
        <AcceptButton token={token} />
      </div>
    </div>
  );
}
