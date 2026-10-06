"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

export function VerifiedSignIn({
  token,
  callbackUrl = "/join/provider/path",
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
          className="mt-4 inline-flex bg-ink px-6 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover"
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
