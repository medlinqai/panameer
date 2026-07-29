import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

/**
 * The stock pre-profile onboarding chrome (brief_W / E049).
 *
 * Logo top-left in a bordered header, one centred content column, no app or
 * marketing nav and deliberately NO stepper — the counter belongs to the
 * post-verification wizard (E003), and these pages all sit before it.
 *
 * ONE definition on purpose. This markup had been copied into three files
 * (`/join` role-select, `PlainShell` in the provider wizard, and the "Get
 * Started Now!" page), and the copies drifted: the Get Started page was still
 * on `max-w-5xl` while the other two were on `max-w-3xl`, which is E049. A
 * shared component is what stops that happening a fourth time.
 *
 * No "use client" — it is pure markup, so the server-rendered Get Started page
 * and the client-rendered wizard can both use it.
 */
export function OnboardingShell({
  children,
  /** Widen only for a page that genuinely needs it; the stock width is 3xl. */
  width = "max-w-3xl",
  /**
   * Tighter vertical padding for the ONE pre-verify page that carries a full
   * form (brief_W / E047). Sign-up has a social block, a divider, five fields,
   * two consent checkboxes and a footer; at the stock rhythm that runs past the
   * bottom of a laptop screen and the "Create My Account" button falls below
   * the fold, which is the worst possible thing to hide on a sign-up page.
   *
   * A named option, not a second copy of the chrome: the short pages keep the
   * stock spacing, and the one exception is visible here rather than buried in
   * a forked layout.
   */
  compact = false,
}: {
  children: ReactNode;
  width?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className={`mx-auto flex ${width} items-center`}>
          <Logo priority />
        </div>
      </header>
      <main
        className={`mx-auto flex w-full ${width} flex-1 flex-col px-6 ${
          compact ? "py-6 sm:py-8" : "py-10 sm:py-14"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
