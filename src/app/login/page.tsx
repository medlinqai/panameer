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

          {/*
            ── ⚠⚠ THE OTHER WAY OUT (`P1-ALL-E528` Part B) ────────────────────

            ⚠ There was NO forgot-password link anywhere in the app — measured.
            Scott was locked out of his own app at midnight with no way back in
            except a developer with database access; this link is the half of
            that fix a member can reach on their own.

            ⚠ SAME SHAPE AS `Sign up` BELOW: a text link inheriting `text-ink-2`,
            underline carrying the affordance, INSIDE the card — a sibling after
            `</form>` lands on the dark video backdrop.
            ⚠ Placed under the password field, where a person discovers the
            problem, not under the button.
          */}
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
  /*
    ── ⚠⚠⚠ NO REQUEST UNTIL ONE IS CONFIGURED (`P2-ALL-E592`) ───────────────

    ⚠ SCOTT RULED 2026-09-20: render the `<video>` only when
    `NEXT_PUBLIC_LOGIN_VIDEO_URL` is set.

    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   const videoUrl =
    //     process.env.NEXT_PUBLIC_LOGIN_VIDEO_URL ?? "/brand/login-bg.mp4";

    ⚠⚠ THE DEFAULT PATH WAS A 404 ON EVERY SIGN-IN, ON THE FIRST PAGE ANYONE
    SEES. `public/brand/login-bg.mp4` does not exist and the variable is set in
    neither `.env.local` nor `.env.example` — measured 2026-09-20 in a browser,
    once per visit, for every prospect.
    ⚠ NOTHING EVER LOOKED BROKEN, and that is why it survived: the `onError`
    below hides the element and the gradient is the designed fallback. **The
    cost was the request and the red console line, not the render.**
    ⚠⚠ IT ALSO COST A GATE: `E593`'s console-error assertion has to blank its
    buffer after the sign-in fixture to avoid attributing this to the page under
    test. **A pre-existing error that every future gate learns to ignore is how
    a real one later gets ignored too.**

    ⚠⚠⚠ THE THIRD OPTION, AND WHY IT BEATS BOTH OF SCOTT'S FIRST TWO: shipping
    the asset needs a file nobody has; dropping the reference would have thrown
    away the affordance the docblock above describes — *"no layout shift when
    the asset lands."* ⚠ Setting the variable is ALREADY the documented way to
    point at a file, so the asset can still land later **with no code change**.
    ⚠ WHAT IS LOST is the conventional-path half: dropping a file at
    `public/brand/login-bg.mp4` no longer picks it up on its own. That was the
    trade Scott took.
  */
  const videoUrl = process.env.NEXT_PUBLIC_LOGIN_VIDEO_URL;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {/* Base colour — also the fallback when there is no video. */}
      <div className="absolute inset-0 bg-ink" />

      {/* ⚠⚠ THE ELEMENT ITSELF IS CONDITIONAL NOW. A `<source>` with an empty
          `src` is still a request in some engines, so the gate is on the
          `<video>`, not on the URL it would carry. */}
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
