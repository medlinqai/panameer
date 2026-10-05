import Link from "next/link";
import { PUBLIC_PAGES, type PublicPage } from "@/lib/audience";

export function AudienceStrip({ page }: { page: PublicPage }) {
  return (
    <div className="border-b border-magenta/20 bg-magenta/8 px-4 py-2.5 text-ink backdrop-blur-[10px] backdrop-saturate-150 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {}
        <div className="inline-flex flex-wrap justify-center gap-1 rounded-full border border-line bg-white/70 p-1">
          {}
          {PUBLIC_PAGES.map((p) => {
            const on = p.key === page;
            return (
              <Link
                key={p.key}
                href={p.href}
                aria-current={on ? "page" : undefined}
                className={
                  "px-4 py-1.5 text-center text-[13.5px] font-bold transition-colors " +
                  (on
                    ? "bg-magenta text-white"
                    : "text-ink-2 hover:text-magenta")
                }
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
