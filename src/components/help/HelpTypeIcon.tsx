import type { HelpLinkType } from "@prisma/client";

// SH2-E008: the type icon on each Help link (Video · Instagram · Word · PDF · Web page).
const PATHS: Record<HelpLinkType, React.ReactNode> = {
  VIDEO: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
  INSTAGRAM: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
  WORD: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 12l1.5 5L12 13l1.5 4L15 12" /></>,
  PDF: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
  WEB_PAGE: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
};
export function HelpTypeIcon({ type, className }: { type: HelpLinkType; className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>{PATHS[type]}</svg>;
}
