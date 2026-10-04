"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RailIcon } from "@/components/casing/RailIcon";
import { bandActiveHref, ACCOUNT_BAND_HREF, type NavItem } from "@/lib/nav";
import "./bottom-nav.css";

export const BOTTOM_NAV_MAX = 5;

export function BottomNav({
  items,
  ownProviderPath = null,
}: {
  items: NavItem[];
  ownProviderPath?: string | null;
}) {
  const pathname = usePathname();

  const activeHref = bandActiveHref(
    pathname,
    [...items.map((i) => i.href), ACCOUNT_BAND_HREF],
    { ownProviderPath }
  );
  const isActive = (href: string) => href === activeHref;

  const shown = items.slice(0, BOTTOM_NAV_MAX);
  const overflow = items.slice(BOTTOM_NAV_MAX);

  if (shown.length === 0) return null;

  return (
    <nav className="pm-bottomnav md:hidden" aria-label="Main menu">
      <ul className="pm-bottomnav-row">
        {shown.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className="pm-bottomnav-cell">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "pm-bottomnav-link min-h-11 " + (active ? "is-active" : "")
                }
              >
                <RailIcon name={item.icon} />
                {}
                <span className="pm-bottomnav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {}
      {overflow.length > 0 && (
        <details className="pm-bottomnav-more">
          <summary className="pm-bottomnav-link min-h-11">
            <RailIcon name="MoreHorizontal" />
            <span className="pm-bottomnav-label">More</span>
          </summary>
          <ul className="pm-bottomnav-overflow">
            {overflow.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="pm-bottomnav-overflow-link min-h-11">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
