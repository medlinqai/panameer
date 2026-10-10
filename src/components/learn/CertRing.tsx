import Link from "next/link";
import { shortCode } from "@/components/learn/LearnPathCard";

// Learn Home hero picture (2026-10-10): certified paths out of all published paths, then the earned badges (newest in magenta).
export function CertRing({ certified, total, badges }: { certified: number; total: number; badges: { slug: string; title: string; at: string }[] }) {
  const R = 104;
  const C = 2 * Math.PI * R;
  const pct = total ? Math.min(1, certified / total) : 0;
  const shown = badges.slice(-8);
  const newest = badges[badges.length - 1] ?? null;
  const when = (iso: string) => {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
    return days < 1 ? "today" : days === 1 ? "yesterday" : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  return (
    <div data-cert-ring>
      <svg viewBox="0 0 280 260" width="100%" className="mx-auto block max-w-[260px]" role="img" aria-label={`${certified} of ${total} learning paths certified`}>
        <style>{`@keyframes pm-ring{from{stroke-dashoffset:${C}}}.pm-ring-arc{animation:pm-ring 1s cubic-bezier(.2,.7,.3,1) both}@media(prefers-reduced-motion:reduce){.pm-ring-arc{animation:none}}`}</style>
        <circle cx={140} cy={130} r={R} fill="none" stroke="#ECEEF4" strokeWidth={16} />
        {pct > 0 && (
          <circle className="pm-ring-arc" cx={140} cy={130} r={R} fill="none" stroke="#d72cd6" strokeWidth={16} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 140 130)" />
        )}
        <text x={140} y={136} textAnchor="middle" fontSize={50} fontWeight={700} fill="#272334">{certified}</text>
        <text x={140} y={164} textAnchor="middle" fontSize={13} fontWeight={600} fill="#4a4658">of {total} paths certified</text>
      </svg>
      {shown.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {shown.map((b) => (
              <Link
                key={b.slug}
                href={`/learn/${b.slug}`}
                title={b.title}
                aria-label={`${b.title} certificate`}
                className={"grid h-[38px] w-[34px] place-items-center text-[9.5px] font-bold text-white transition hover:opacity-85 " + (b === newest ? "bg-[#d72cd6]" : "bg-[#272334]")}
                style={{ clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)" }}
              >
                {shortCode(b.title)}
              </Link>
            ))}
          </div>
          {newest && (
            <p className="mt-2 text-center text-[12px] text-ink-2">
              Newest: <b className="text-ink">{newest.title}</b> · {when(newest.at)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
