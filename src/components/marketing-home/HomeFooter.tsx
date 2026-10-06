import "@/components/marketing-home/home.css";
import Link from "next/link";
import { BRAND_BADGE } from "@/lib/brand";
import {
  FOOTER_ASSESSMENT,
  FOOTER_GROUPS,
  FOOTER_LEGAL,
  type FooterEntry,
} from "@/components/marketing/brand";

const SOCIALS = [
  {
    label: "Panameer on YouTube",
    href: "https://youtube.com/c/panameer",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.507a3.02 3.02 0 0 0-2.122-2.136C19.505 3.867 12 3.867 12 3.867s-7.505 0-9.378.504A3.02 3.02 0 0 0 .5 6.507C0 8.39 0 12.32 0 12.32s0 3.93.5 5.813a3.02 3.02 0 0 0 2.122 2.136c1.873.504 9.378.504 9.378.504s7.505 0 9.378-.504a3.02 3.02 0 0 0 2.122-2.136c.5-1.883.5-5.813.5-5.813s0-3.93-.5-5.813ZM9.545 15.887V8.754l6.273 3.567z" />
      </svg>
    ),
  },
] as const;

function FooterRow({ entry }: { entry: FooterEntry }) {
  if (!entry.href) {
    return (
      <span className="foot-tbd">
        {entry.label}
        <span className="foot-tbd-tag">TBD</span>
      </span>
    );
  }
  return <Link href={entry.href}>{entry.label}</Link>;
}

/* Six index groups, then Legal — which this shell renders as its bottom strip. */
const COLUMNS = FOOTER_GROUPS;

export function HomeFooter() {
  return (
    <div className="pm-home">
      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              {/* — the segmented-square lockup. Sized by */}
              {/* eslint-disable-next-line @next/next/no-img-element -- the ported
          stylesheet sizes this by class (.brand-logo/.foot-logo); next/image
          needs explicit dimensions and would fight the mockup's CSS for a
          30px-tall wordmark. Same call the rest of the marketing surface makes. */}
              <img
                className="brand-logo foot-logo"
                src="/brand/panameer-lockup-white.png"
                alt="Panameer"
              />
              {}
              <div className="foot-desc">{BRAND_BADGE}</div>
              <div className="socials">
                {SOCIALS.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="foot-groups">
              {COLUMNS.map((col) => (
                <div className="fcol" key={col.title}>
                  <h5>{col.title}</h5>
                  {col.entries.map((e) => (
                    <FooterRow key={e.label} entry={e} />
                  ))}
                  {/* The assessment hangs under Learn — the free front door. */}
                  {col.title === "Learn" && (
                    <FooterRow entry={FOOTER_ASSESSMENT} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="foot-bot">
            <span>© 2026 Panameer Inc. All rights reserved.</span>
            <span className="lg">
              {FOOTER_LEGAL.map((l) => (
                <Link key={l.label} href={l.href!}>
                  {l.label}
                </Link>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
