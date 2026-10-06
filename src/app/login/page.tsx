"use client";

import { Suspense, useState } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Logo } from "@/components/Logo";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialSignIn } from "@/components/auth/SocialSignIn";
import { PasswordReveal } from "@/components/PasswordReveal";

/** Reasons the OAuth signIn callback can refuse a sign-in (brief_Q). */
const OAUTH_ERRORS: Record<string, string> = {
  OAuthno_email:
    "That provider didn't share an email address, so we can't sign you in. Use your email and password instead.",
  OAuthunverified_email:
    "That provider hasn't verified your email address, so we can't link it to a Panameer account.",
  OAuthlocked: "This account is locked. Contact support to unlock it.",
  OAuthinactive: "This account is deactivated.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // No default here — where "home" is depends on WHO signed in, and that isn't
  const callbackUrl = searchParams.get("callbackUrl");
  const oauthError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    oauthError ? (OAUTH_ERRORS[oauthError] ?? null) : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    if (callbackUrl) {
      router.push(callbackUrl);
    } else {
      const home = await fetch("/api/home")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.home ?? "/dashboard")
        .catch(() => "/dashboard");
      router.push(home);
    }
  }

  return (
    <>
      <MarketingHeader />
      <main className="relative flex flex-1 items-center justify-center overflow-hidden p-6 font-body">
        <LoginBackdrop />

        <form
          onSubmit={onSubmit}
          className="relative z-10 w-full max-w-sm space-y-4 rounded-brand border border-white/15 bg-white/95 p-8 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] backdrop-blur-sm"
        >
          <div className="space-y-1 text-center">
            <div className="flex justify-center">
              <Logo priority />
            </div>
            <p className="pt-1 text-sm text-ink-2">Sign in to continue</p>
          </div>

          <SocialSignIn callbackUrl={callbackUrl ?? "/dashboard"} />

          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs font-semibold text-ink-2">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <label className="block text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-magenta"
            />
          </label>

          {}
          {}
          <label className="block text-sm font-medium">
            Password
            <PasswordReveal id="login-password">
              {({ type, className }) => (
                <input
                  id="login-password"
                  type={type}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className={`mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-magenta ${className}`}
                />
              )}
            </PasswordReveal>
          </label>

          {/* THE OTHER WAY OUT Part B) */}
          <p className="text-right text-[13px] text-ink-2">
            <a href="/forgot-password" className="underline transition-colors hover:text-ink">
              Forgot password?
            </a>
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-magenta px-4 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {/* THE WAY OUT */}
          <p className="text-center text-[13px] text-ink-2">
            Need an account?{" "}
            <a
              href="/join"
              className="underline transition-colors hover:text-ink"
            >
              Sign up
            </a>
          </p>
        </form>
      </main>
      {/* OUTSIDE the card, outside any `.pm-home` — see the note above. */}
      <MarketingFooter />
    </>
  );
}

/** The signed-out backdrop (PJv2 WS11 / E063). */
function LoginBackdrop() {
  // NO REQUEST UNTIL ONE IS CONFIGURED
  const videoUrl = process.env.NEXT_PUBLIC_LOGIN_VIDEO_URL;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Base colour — also the fallback when there is no video. */}
      <div className="absolute inset-0 bg-ink" />

      {/* THE ELEMENT ITSELF IS CONDITIONAL NOW. A `<source>` with an empty */}
      {videoUrl && (
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        autoPlay
        muted
        loop
        playsInline
        // Decorative: a missing file must fail silently, not surface a
        // broken-media control over the sign-in form.
        onError={(e) => {
          (e.currentTarget as HTMLVideoElement).style.display = "none";
        }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      )}

      {/* Brand wash: ink navy → magenta, plus a vignette for card contrast. */}
      <div className="absolute inset-0 bg-gradient-to-br from-ink/95 via-ink/80 to-magenta/50" />
      {/* THE VIGNETTE COLOUR IS THE BRAND DARK #272334 = rgb(39,35,52), MATCHING */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(24,30,60,0.75)_100%)]" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
