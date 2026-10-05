import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

// Slim onboarding bar (mockup register_step_frame 2026-10-05): logo left, Finish later right on wizard steps.
export function OnboardingBar({ right }: { right?: ReactNode }) {
  return (
    <header data-onboarding-bar className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4 sm:px-8">
        <Link href="/" aria-label="Panameer home" className="-translate-y-[2px]">
          <Image src="/brand/panameer-lockup-ink.png" alt="Panameer" width={1642} height={278} priority className="h-7 w-auto [[data-theme=dark]_&]:hidden" />
          <Image src="/brand/panameer-lockup-white.png" alt="Panameer" width={1642} height={278} className="hidden h-7 w-auto [[data-theme=dark]_&]:block" />
        </Link>
        {right}
      </div>
    </header>
  );
}
