import { shortCode } from "@/components/learn/LearnPathCard";

// Scott 10-23: job cards get the Learn-style cover — a deep two-tone tile per Category, a big faint code from the
// job title, and the Category in white. Same family as the Learn path cards.
const TONE: Record<string, [string, string]> = {
  "ERP & Oracle": ["#272334", "#4b3e6e"],
  "AI & Automation": ["#14111d", "#5a2f78"],
  "Finance & Admin": ["#1d2a3a", "#36506e"],
  IT: ["#1a2a30", "#2f5a6b"],
  Websites: ["#1f2340", "#3f4a8a"],
  Marketing: ["#2b1830", "#7a2f6f"],
  "Lead Generation": ["#2b2219", "#6a4a2f"],
  Printing: ["#23261a", "#4f5a2f"],
  Transportation: ["#1f2b28", "#3e5f55"],
  Facilities: ["#262626", "#55524d"],
  "Mentoring & Advisory": ["#272334", "#6b2f6a"],
};

export function JobCover({ category, title, className = "" }: { category?: string | null; title: string; className?: string }) {
  const [from, to] = TONE[category ?? ""] ?? ["#272334", "#4a4658"];
  return (
    <div className={`relative flex h-full min-h-[120px] items-end overflow-hidden px-3.5 py-3 text-white ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }} data-job-cover>
      <span aria-hidden className="absolute -right-2 -top-4 text-[84px] font-extrabold leading-none tracking-[-4px] opacity-[0.14]">{shortCode(title)}</span>
      <span className="relative text-[11px] font-bold tracking-[0.1em] opacity-90 [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">{(category ?? "Job").toUpperCase()}</span>
    </div>
  );
}
