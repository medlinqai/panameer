import type { ReactNode } from "react";
import { OnboardingFrame, FRAME_WIDTH } from "@/components/onboarding/OnboardingFrame";

export function OnboardingShell({
  children,
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
