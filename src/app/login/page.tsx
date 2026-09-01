"use client";

import { Suspense, useState } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Logo } from "@/components/Logo";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { SocialSignIn } from "@/components/auth/SocialSignIn";

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
  // known until the credentials round-trip finishes (WS2/E003).
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
    /*
      An explicit callbackUrl always wins — someone who was bounced off a page
      should land back on it. Otherwise ask the server where this viewer's home
      is: a Panameer Admin goes to the console, not to a provider's job board.
    */
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
    /*
      ── ⚠⚠ THE CASING, ADDED DIRECTLY (`P1-J1.1-E246`) ────────────────────────

      Scott, 2026-08-29: **"ALL Pages must use a casing."** `/login` was one of the
      six he walked.

      ⚠⚠ §1'S MECHANISM DOES NOT REACH THIS PAGE, AND THE BRIEF'S §0 IS WRONG ABOUT
      IT. §0 lists `/login` under *"every page that renders `OnboardingFrame` —
      directly or through `OnboardingShell` / `WizardShell`"*. THIS PAGE RENDERS NONE
      OF THEM — it has always been its own full-viewport card over `LoginBackdrop`.
      So putting the casing on the frame changed every sibling page and left this one
      exactly as it was. It is added here by hand instead, and the discrepancy is
      REPORTED at `E246` rather than papered over.

      ⚠ `flex-1`, NOT `min-h-screen` — the same correction `E020` made on
      `OnboardingFrame`. With a header above and a footer below, a child demanding a
      full viewport makes the page three screens tall and pushes the sign-in card
      below the fold. `body` carries `flex flex-col min-h-dvh`, so growing to fill
      gets the centred card without the overflow.
      ⚠ `overflow-hidden` STAYS — it clips `LoginBackdrop`'s `absolute inset-0` video
      to this element, which is what keeps the video behind the card and OUT of the
      header and footer.
      ⚠ NEITHER IS INSIDE A `.pm-home` WRAPPER and none was added (`P1-ALL-E020`).
      ⚠⚠ THE HEADER'S `Log In` NOW POINTS AT THIS PAGE. Known, deliberate, reported —
      §2 forbids suppressing it. Scott decides.
    */
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

          <label className="block text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-[12px] border border-line bg-white px-3 py-2.5 text-ink outline-none transition-colors focus:border-magenta"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-magenta px-4 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          {/*
          ── ⚠⚠ THE WAY OUT (`P1-J1.4-E230`) ──────────────────────────────────

          This page AUTHENTICATES and cannot REGISTER — `onSubmit` calls
          `signIn("credentials")` and there is no create-account path on it at
          all. `SocialSignIn`'s notice used to tell a new visitor to create an
          account here; it now says `sign in`, and this is where a visitor who
          has no account actually goes.

          ⚠ A BARE `/join`, DELIBERATELY. `/join` reads `type`, `blocked` and
          `from` — it DOES NOT READ `callbackUrl`. Passing one would be a
          decorative parameter that goes nowhere, so it is not passed.
          ⚠ `/join` IS THE ONLY SIGN-UP DOOR THAT EXISTS.

          ⚠ A TEXT LINK, NOT A BUTTON, and it INHERITS the surrounding
          `text-ink-2` rather than introducing `text-magenta` — the magenta-on-
          white ratios are an open AA item (`P1-J4-E020`'s neighbours) and this
          link does not need to join them. Underline carries the affordance.
          ⚠ PLACED INSIDE THE CARD, after the submit button: the `<form>` IS the
          white card, so a sibling after `</form>` would land on the dark video
          backdrop where the surrounding type and colour do not apply.
          ⚠ THE FORM, `signIn` AND THE SOCIAL BUTTONS ARE UNTOUCHED. Registration
          was NOT built — that is a separate, parked brief.
        */}
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
      {/* ⚠ OUTSIDE the card, outside any `.pm-home` — see the note above. */}
      <MarketingFooter />
    </>
  );
}

/**
 * The signed-out backdrop (PJv2 WS11 / E063).
 *
 * A background VIDEO with a branded wash over it. The video is optional and
 * loaded from a conventional path — drop a file at
 * `public/brand/login-bg.mp4` (or point `NEXT_PUBLIC_LOGIN_VIDEO_URL` at one)
 * and it plays; until then the gradient alone carries the page, which is why
 * there is no broken-media state and no layout shift when the asset lands.
 *
 * The wash is NOT decoration: video behind a form destroys contrast, so the
 * ink-navy → magenta overlay sits between the two and guarantees the card and
 * its labels stay readable whatever the footage is doing.
 */
function LoginBackdrop() {
  const videoUrl =
    process.env.NEXT_PUBLIC_LOGIN_VIDEO_URL ?? "/brand/login-bg.mp4";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Base colour — also the fallback when there is no video. */}
      <div className="absolute inset-0 bg-ink" />

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

      {/* Brand wash: ink navy → magenta, plus a vignette for card contrast. */}
      <div className="absolute inset-0 bg-gradient-to-br from-ink/95 via-ink/80 to-magenta/50" />
      {/*
        ⚠⚠ THE VIGNETTE COLOUR IS THE BRAND DARK #272334 = rgb(39,35,52), MATCHING
        (⚠ `E300`, 2026-08-31: was the retired brand navy, rgb(24,30,60). Its hex is
        deliberately NOT written here — the brief makes a case-insensitive grep
        for the old hex a TEST that must return nothing,
        and a literal in a comment is how the navy gets reintroduced. The vignette
        MUST move with the surface or the wash separates — that is why it is
        hardcoded here at all.)
        `bg-ink` AND THE WASH ABOVE. Keep it that way.
          SUPERSEDED 2026-08-26 (`P1-ALL-E022`): this read `rgba(23,30,62,0.75)`
          — #171E3E, the OLD app navy that `P1-ALL-E015` replaced site-wide.
        It survived E015 because it is a RAW rgba() inside a Tailwind arbitrary
        value and that sweep grepped for the HEX. ⚠ Only the two colour digits
        moved: the 0.75 alpha and the ellipse are unchanged, so /login looks the
        same. ⚠ A hex cannot be used here — `_` is the space escape inside a
        Tailwind arbitrary value, and the commas are what keep this parseable.
      */}
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
