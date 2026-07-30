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
   * The stock width is the shared frame's. Narrow FORM pages pass `max-w-3xl`
   * deliberately: a widened frame is right for a two-column page and wrong for a
   * single column of inputs, which just gets long lines.
   */
  width = FRAME_WIDTH,
  compact = false,
  footer,
}: {
  children: ReactNode;
  width?: string;
  compact?: boolean;
  footer?: ReactNode;
}) {
  return (
    <OnboardingFrame width={width} compact={compact} footer={footer}>
      {children}
    </OnboardingFrame>
  );
}
