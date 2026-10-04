import Link from "next/link";
import Image from "next/image";
import { BRAND_DESCRIPTOR } from "@/lib/brand";
import { FOOTER_LEGAL } from "@/components/marketing/brand";
import {
  FOOTER_SOCIALS,
  FOOTER_VIDEO_COLUMNS,
  footerVideoHref,
  footerVideoLabel,
} from "@/components/marketing/footer-videos";

function SocialIcon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

const BAND2_LINKS: { label: string; href?: string }[] = [
  { label: "About Us" },
  { label: "Contact Us" },
  { label: "Why Panameer", href: "/why-panameer" },
  { label: "Pricing" },
];

export function MarketingFooter() {
  return (
    <footer className="mt-10 bg-ink text-[#cfc7da]">
      {/* ══ BAND 1 — the three video columns, the footer's dominant element ══ */}
      <div className="mx-auto max-w-[1180px] px-6 pb-11 pt-12">
        {}
        <div className="grid grid-cols-1 gap-x-14 gap-y-10 min-[640px]:grid-cols-2 min-[901px]:grid-cols-3">
          {FOOTER_VIDEO_COLUMNS.map((col) => (
            <div key={col.title}>
              {}
              <h2 className="mb-3.5 font-body text-[17px] font-bold leading-[1.3] text-white">
                {col.title}
              </h2>
              {}
              <ul>
                {col.items.map((item) => {
                  const label = footerVideoLabel(item);
                  const href = footerVideoHref(item);
                  return (
                    <li
                      key={label}
                      className="my-1.5 text-[14.5px] leading-[1.45]"
                    >
                      {href ? (
                        <Link href={href} className="hover:text-white">
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BAND 2 — brand block left, the four-item row right ══════════════ */}
      {}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-9 min-[901px]:flex-row min-[901px]:items-start min-[901px]:justify-between">
          <div>
            {}
            <Image
              src="/brand/panameer-lockup-white.png"
              alt="Panameer"
              width={1642}
              height={278}
              className="h-8 w-auto"
            />
            {}
            <p className="mt-3 max-w-[560px] text-[14.5px] leading-[1.5]">
              {BRAND_DESCRIPTOR}
            </p>
            {}
            <div className="mt-4 flex items-center gap-4">
              {FOOTER_SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-[#cfc7da] transition-colors hover:text-white"
                >
                  <SocialIcon path={s.path} />
                </a>
              ))}
            </div>
          </div>

          {}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-[14.5px] min-[901px]:justify-end">
            {BAND2_LINKS.map((e, i) => (
              <span key={e.label} className="flex items-center gap-x-2.5">
                {i > 0 && (
                  <span aria-hidden className="text-white/40">
                    |
                  </span>
                )}
                {e.href ? (
                  <Link href={e.href} className="hover:text-white">
                    {e.label}
                  </Link>
                ) : (
                  <span>{e.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {}
      {}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 text-[13px] text-[#9a92a8]">
          <span>2026 Panameer</span>
          {FOOTER_LEGAL.map((e) =>
            e.href ? (
              <Link key={e.label} href={e.href} className="hover:text-white">
                {e.label}
              </Link>
            ) : (
              <span key={e.label}>{e.label}</span>
            ),
          )}
          {}
          <span className="text-[#9a92a8]">{BRAND_DESCRIPTOR}</span>
        </div>
      </div>
    </footer>
  );
}
