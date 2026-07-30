import type { ReactNode } from "react";
import { OnboardingFrame, FRAME_WIDTH } from "@/components/onboarding/OnboardingFrame";

/**
 * The stock pre-profile onboarding chrome (brief_W / E049), now a thin wrapper
 * over the shared `OnboardingFrame` (Run6 WS2).
 *
 * ONE definition on purpose. This markup had been copied into three files
 * (`/join` role-select, `PlainShell` in the provider wizard, and the "Get
 * Started Now!" page) and the copies drifted — the Get Started page sat on
 * `max-w-5xl` while the other two were on `max-w-3xl`, which is E049. Sharing a
 * component stopped that; sharing the FRAME with the wizard stops the wizard and
 * these pages drifting apart too, which is what E080/E082 turned out to be.
 *
 * No "use client" — pure markup, so the server-rendered Get Started page and the
 * client-rendered wizard can both use it.
 */
export function OnboardingShell({
  children,
  /**
   * Every onboarding page is on the shared frame width now (E091). A page with a
   * single column of inputs caps the COLUMN via `contentWidth` instead of
   * narrowing the whole page — same chrome everywhere, readable form inside it.
   */
  width = FRAME_WIDTH,
  contentWidth,
  compact = false,
  footer,
}: {
  children: ReactNode;
  width?: string;
  contentWidth?: string;
  compact?: boolean;
  footer?: ReactNode;
}) {
  return (
    <OnboardingFrame
      width={width}
      contentWidth={contentWidth}
      compact={compact}
      footer={footer}
    >
      {children}
    </OnboardingFrame>
  );
}
