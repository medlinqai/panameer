import type { ReactNode } from "react";

// AI source line (onboarding frame): magenta 2px left rule, "From your résumé: …".
export function AiLine({ children, lead = "From your résumé:", className = "mb-3" }: { children: ReactNode; lead?: string; className?: string }) {
  return (
    <p data-ai-line className={`border-l-2 border-magenta py-2.5 pl-3.5 text-[14px] leading-relaxed text-ink ${className}`}>
      <b className="font-bold">{lead}</b> {children}
    </p>
  );
}
