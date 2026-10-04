import Link from "next/link";

export type GateNoticeGap = {
  key: string;
  field: string;
  reason: string;
  href: string;
};

export function GateNotice({
  gaps,
  heading,
  lede,
  className = "",
}: {
  gaps: GateNoticeGap[];
  heading: string;
  /** One sentence of context. Optional — the rows carry the substance. */
  lede?: string;
  className?: string;
}) {
  if (gaps.length === 0) return null;
  return (
    <div className={`rounded-brand border border-line bg-bg-soft p-4 ${className}`}>
      <p className="text-[14px] font-bold">{heading}</p>
      {lede && (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{lede}</p>
      )}
      <ul className="mt-2.5 grid gap-2">
        {gaps.map((g) => (
          <li key={g.key} className="text-[13.5px] leading-relaxed">
            <Link href={g.href} className="font-bold text-magenta hover:underline">
              {g.field}
            </Link>{" "}
            <span className="text-ink-2">— {g.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
