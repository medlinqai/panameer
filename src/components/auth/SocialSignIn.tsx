"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

/**
 * Google / Apple sign-in buttons (brief_Q, restyled by brief_S/E020,
 * relabelled + made container-responsive by brief_W/E046).
 *
 * LinkedIn was REMOVED in PJv2 WS13 (E069): with the LinkedIn profile import
 * gone there is nothing it uniquely offers, and Scott's call is "no sense having
 * LinkedIn anywhere". Google and Apple stay.
 *
 * LABELS (E046): the full "Continue with …" wording, matching the `aria-label`
 * and the approved mockup. The short labels existed only so the buttons would
 * squeeze into a narrow column, and on the narrow `/login` card they still
 * truncated.
 *
 * LAYOUT (E046): a CONTAINER query, not a media query. This component has two
 * parents of very different widths — the `max-w-xl` sign-up column and the
 * `max-w-sm` login card — and they are viewed at the SAME viewport, so a
 * viewport breakpoint cannot tell them apart: any `sm:grid-cols-3` rule that
 * gives the sign-up page its row would also force three full labels into the
 * 320px login card and clip them. `@container` + `@md:grid-cols-3` asks the
 * question that actually matters — how much room did MY parent give me — so the
 * sign-up page gets one row and the login card stacks, with no page-specific
 * props to keep in sync.
 *
 * COLOURS (E020): Apple black, and Google as the
 * standard WHITE button with the OFFICIAL multicolour "G" — Google's brand
 * guidelines don't permit recolouring the mark, and Scott's reference sheet had
 * a solid-blue G, which is why the G below is the real four-colour path.
 *
 * A button is LIVE only when that provider's credentials exist. We read
 * NextAuth's own `/api/auth/providers`, which lists exactly what `auth.ts`
 * registered, so the client never learns anything secret.
 */

type ProviderId = "google" | "apple";

/** Official Google "G" — four-colour, not tinted. */
function GoogleG({ className = "h-[18px] w-[18px] shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AppleMark({ className = "h-[19px] w-[19px] shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 12.79c-.03-2.75 2.25-4.07 2.35-4.13-1.28-1.87-3.27-2.13-3.98-2.16-1.7-.17-3.31 1-4.17 1-.86 0-2.19-.98-3.6-.95-1.85.03-3.56 1.08-4.51 2.73-1.92 3.34-.49 8.28 1.38 10.99.92 1.33 2.01 2.81 3.45 2.76 1.38-.06 1.91-.89 3.58-.89 1.67 0 2.14.89 3.6.86 1.49-.03 2.43-1.35 3.34-2.68 1.05-1.54 1.49-3.03 1.51-3.11-.03-.01-2.9-1.11-2.93-4.42zM14.3 4.6c.76-.92 1.27-2.2 1.13-3.47-1.09.04-2.42.73-3.2 1.64-.7.81-1.31 2.11-1.15 3.35 1.22.09 2.46-.62 3.22-1.52z" />
    </svg>
  );
}

/*
  ── ⚠⚠ COLOUR AND HOVER ARE SEPARATE FIELDS (`P1-J1.1-E233`, 2026-08-30) ────

  Scott: *"We can do B for now, gets them looking right, can fix later."*

  `className` is what the button ALWAYS looks like. `hoverClassName` is applied
  ONLY when the provider is actually live. Before this split, both lived in one
  string and `disabled:opacity-45` sat on the shared base — so with no OAuth
  credentials configured (which is ALWAYS, today) Apple's black and Google's
  white both rendered as the same dead grey, and a disabled button still
  changed colour under the cursor.

  ⚠⚠ THE COLOURS THEMSELVES ARE UNTOUCHED. Apple black and Google's untinted
  four-colour mark on white are mandated by `E020` and by Google's own brand
  guidelines. This row was about the DISABLED TREATMENT, never the palette.
  ⚠ AND THE BUTTONS ARE NOT HIDDEN — Scott chose B over C explicitly.
*/
const BUTTONS: {
  id: ProviderId;
  label: string;
  className: string;
  hoverClassName: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "apple",
    label: "Apple",
    className: "bg-black text-white border-black",
    hoverClassName: "hover:bg-[#1a1a1a]",
    icon: <AppleMark />,
  },
  {
    id: "google",
    // Google's guidelines: white button, dark text, untinted multicolour mark.
    label: "Google",
    className:
      "bg-white text-[#3c4043] border-[#dadce0] shadow-[0_1px_2px_rgba(60,64,67,0.15)]",
    hoverClassName: "hover:bg-[#f7f8f8]",
    icon: <GoogleG />,
  },
];

export function SocialSignIn({
  /*
    ⚠ `/join` (`E234`). ⚠ SUPERSEDED, quoted: `"/join/provider"`.
    ⚠ THIS DEFAULT IS DEAD IN PRACTICE and was still worth fixing — both call
    sites pass one explicitly (`login/page.tsx:109`, and `SignUpForm.tsx:153`
    which forwards its own). A default nobody reaches is exactly where a
    side-picking value survives unnoticed.
  */
  callbackUrl = "/join",
  disabledHint = "Coming soon",
}: {
  callbackUrl?: string;
  disabledHint?: string;
}) {
  const [available, setAvailable] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState<ProviderId | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, unknown>) => {
        if (!cancelled) setAvailable(new Set(Object.keys(data ?? {})));
      })
      .catch(() => {
        // Fail closed: if we can't tell, show the buttons disabled rather than
        // sending the user into a provider that isn't wired up.
        if (!cancelled) setAvailable(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const anyLive = available !== null && BUTTONS.some((b) => available.has(b.id));

  return (
    <div className="@container">
      {/* Stacked by default (the narrow login card), three across once the
          CONTAINER — not the window — is wide enough for full labels.

          The threshold is MEASURED: the longest remaining label ("Continue with
          Google") is ~154px at this size, plus an 18px brand mark, the gap and
          the padding — ~194px per button, so TWO need ~400px. Below that the row
          would push the mark or the text out of the button, so it stacks
          instead. (Was 640px when LinkedIn made it three — WS13.) */}
      <div className="grid grid-cols-1 gap-2.5 @[400px]:grid-cols-2">
        {BUTTONS.map((b) => {
          const live = available?.has(b.id) ?? false;
          return (
            <button
              key={b.id}
              type="button"
              disabled={!live || busy !== null}
              /*
                ⚠ `aria-disabled` ALONGSIDE `disabled`, NOT INSTEAD OF IT
                (`E233`). The real `disabled` attribute is what makes the button
                genuinely non-interactive — this row is a LOOK, not a behaviour,
                and Scott's note ("can fix later") is about wiring OAuth, not
                about letting people click a dead button. The ARIA attribute is
                stated explicitly so the disabled state survives any future
                refactor to a non-`<button>` element.
              */
              aria-disabled={!live || busy !== null}
              title={live ? `Continue with ${b.label}` : disabledHint}
              aria-label={`Continue with ${b.label}`}
              onClick={() => {
                setBusy(b.id);
                void signIn(b.id, { callbackUrl });
              }}
              className={
                // `whitespace-nowrap`, never `truncate`: a label that doesn't
                // fit must be visible as a layout bug, not quietly clipped.
                /*
                  ⚠ NO `disabled:opacity-45` (`E233`). It used to sit here and it
                  is what turned both brand colours grey whenever OAuth was not
                  configured. `disabled:cursor-not-allowed` STAYS — with the
                  colour no longer signalling the state, the cursor and the
                  caption beneath the row are what say "not yet".
                  ⚠ THE HOVER CLASS IS GATED ON `live`, so a dead button does not
                  brighten under the pointer. Concatenating it unconditionally
                  would have left the one interactive-looking behaviour behind.
                */
                "flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-2 text-[13.5px] font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed " +
                b.className +
                (live ? " " + b.hoverClassName : "")
              }
            >
              {b.icon}
              <span>{busy === b.id ? "…" : `Continue with ${b.label}`}</span>
            </button>
          );
        })}
      </div>

      {available !== null && !anyLive && (
        /*
          ⚠⚠ `sign in`, NOT `create an account` (`P1-J1.4-E230`, Scott 2026-08-26:
          *"make the change."*).

          ⚠ THE FORM BELOW THIS CALLS `signIn("credentials")` AND NOTHING ELSE. IT
          AUTHENTICATES; IT CANNOT REGISTER. So this line used to instruct a
          brand-new visitor to create an account, and the only control under the
          instruction would reject them. ⚠ IT IS ALSO THE LANDING SPOT FOR
          `/learn`'s `Start Learning for Free`, so the first thing a new learner
          read was an instruction the page could not honour.

          ⚠ SUPERSEDED 2026-08-26, quoted not deleted:
            *"Social sign-in isn't configured yet — create an account with your
             email below."*

          ⚠ THE FIX IS THE COPY PLUS THE WAY OUT — `login/page.tsx` now carries a
          `Need an account? Sign up` link to `/join`, the only sign-up door that
          exists. ⚠ REGISTRATION WAS NOT BUILT HERE; real sign-up on `/login` is a
          separate brief Scott has parked.
        */
        <p className="mt-2.5 text-center text-[13px] text-ink-2">
          Social sign-in isn&apos;t configured yet — sign in with your email
          below.
        </p>
      )}
    </div>
  );
}
