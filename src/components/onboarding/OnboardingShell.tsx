import type { ReactNode } from "react";
import { OnboardingFrame, FRAME_WIDTH } from "@/components/onboarding/OnboardingFrame";

export function OnboardingShell({
  children,
  width = FRAME_WIDTH,
  contentWidth,
  compact = false,
  footer,
  onboarding = true,
}: {
  children: ReactNode;
  width?: string;
  contentWidth?: string;
  compact?: boolean;
  footer?: ReactNode;
  /** Every OnboardingShell page is an onboarding page: slim bar, no marketing chrome. */
  onboarding?: boolean;
}) {
  return (
    <OnboardingFrame
      width={width}
      contentWidth={contentWidth}
      compact={compact}
      footer={footer}
      onboarding={onboarding}
    >
      {children}
    </OnboardingFrame>
  );
}
