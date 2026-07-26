"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

/**
 * The sign-in half of the email verification link (brief_S / E022).
 *
 * HARD REQUIREMENT: verifying must NOT drop the provider on a login screen.
 * The server page has already validated the email token and minted a
 * single-use SIGNIN token; this exchanges it for a real session and continues
 * straight into "Get Started Now!".
 *
 * Runs automatically on mount with a manual fallback button, so a browser that
 * blocks the automatic POST (or a token that expired in a long-idle tab) still
 * has a way forward rather than a dead end.
 */
export function VerifiedSignIn({
  token,
  callbackUrl = "/join/provider/start",
}: {
  token: string;
  callbackUrl?: string;
}) {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // StrictMode double-invokes effects in dev; the token is single-use, so a
    // second exchange would consume nothing and fail. Guard it.
    if (started.current) return;
    started.current = true;

    void signIn("verify-token", { token, callbackUrl, redirect: true }).then(
      (res) => {
        // With redirect:true a success navigates away; anything returned here
        // means the exchange failed.
        if (res?.error) setFailed(true);
      }
    );
  }, [token, callbackUrl]);

  if (failed) {
    return (
      <div className="mt-6">
        <p className="text-[14px] text-ink-2">
          Your email is verified, but we couldn&apos;t sign you in
          automatically.
        </p>
        <a
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="mt-4 inline-flex rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
        >
          Log In to Continue
        </a>
      </div>
    );
  }

  return (
    <p className="mt-6 text-[15px] font-semibold text-ink-2">
      Signing you in…
    </p>
  );
}
