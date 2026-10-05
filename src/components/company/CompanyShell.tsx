import Link from "next/link";
import type { ReactNode } from "react";
import type { CompanyView } from "@/lib/company-view";
import { CleanSide } from "@/components/profile/CleanSection";
import "@/components/community/connect-profile.css";

// My Company layout (mockup my_company 2026-10-05), built like My Profile: logo column left, name + meta right.
// role "buyer" = the public, buyer-safe view: no readiness, no edit, no invite, no visibility.
export type CompanyRole = "admin" | "member" | "buyer";

const SINCE = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const Missing = ({ children }: { children: ReactNode }) => <span className="italic text-ink-3">{children}</span>;
export const EditLink = ({ href, label = "Edit" }: { href: string; label?: string }) => (
  <Link href={href} scroll={false} className="ml-2 text-[11.5px] font-bold text-magenta-dark hover:underline">
    {label}
  </Link>
);

export function CompanyShell({ c, role, visibility, children }: { c: NonNullable<CompanyView>; role: CompanyRole; visibility?: ReactNode; children: ReactNode }) {
  const admin = role === "admin";
  const buyer = role === "buyer";
  const where = [c.stateOfFiling, c.country].filter(Boolean).join(", ");
  const r = c.readiness;
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-page={role}>
      {!buyer && (
        <p className="mb-[22px] mt-1 text-[13px] font-semibold">
          Your company page is what buyers see next to your name on proposals and work orders.{" "}
          <span className="font-normal text-ink-3">{admin ? "Only admins can edit it." : "Only your company's admins can edit it."}</span>
        </p>
      )}
      {/* Desktop: logo column left (top + bottom blocks), page right. Phone: logo | readiness, page, then actions. */}
      <div className="grid gap-[26px] md:grid-cols-[234px_minmax(0,1fr)] md:grid-rows-[auto_1fr] md:gap-x-[50px] md:gap-y-0">
        <aside className="grid min-w-0 grid-cols-[140px_minmax(0,1fr)] items-center gap-5 md:col-start-1 md:row-start-1 md:block">
          <div className="relative grid h-[140px] w-[140px] place-items-center border border-line bg-surface md:h-[234px] md:w-[234px]">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt={`${c.name} logo`} className="max-h-[80%] max-w-[80%] object-contain" />
            ) : (
              <span className="grid h-[72px] w-[72px] place-items-center bg-[linear-gradient(135deg,#2b2438,#5b4d78)] text-[28px] font-extrabold text-white md:h-[120px] md:w-[120px] md:text-[44px]">
                {c.name.trim()[0]?.toUpperCase() ?? "?"}
              </span>
            )}
            {admin && (
              <Link href="/company/branding" className="absolute bottom-2 right-2 border border-line bg-surface px-2.5 py-1 text-[11.5px] font-bold text-magenta-dark">
                Edit logo
              </Link>
            )}
          </div>
          {r && (
            <div data-readiness={r.score}>
              <CleanSide title="Company Readiness">
                <div className="flex items-center gap-4">
                  <span className="pm-score-ring" style={{ background: `conic-gradient(var(--color-ink) 0 ${r.score}%, var(--color-line) ${r.score}% 100%)` }}>
                    <span className="tabular-nums">{r.score}</span>
                  </span>
                  <span className="min-w-0 text-[13px] leading-snug text-ink-2">
                    out of 100
                    <br />
                    {r.left > 0 ? (
                      <Link href={admin ? "/company?edit=details#details" : "/company#details"} className="font-semibold text-magenta-dark hover:underline" data-readiness-next={r.first?.[0]}>
                        {r.left} {r.left === 1 ? "thing" : "things"} to finish
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">Everything is filled in</span>
                    )}
                  </span>
                </div>
              </CleanSide>
            </div>
          )}
        </aside>

        <main className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-1">
          <h1 className="text-[30px] font-extrabold leading-tight">
            {c.name}
            {admin && <EditLink href="/company?edit=details#details" />}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {[c.industry, c.taxType].filter(Boolean).join(" · ") || (buyer ? null : <Missing>Add industry and business type</Missing>)}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13.5px] text-ink-2" data-company-meta>
            <span>{where || (buyer ? null : <Missing>Add country and state</Missing>)}</span>
            <span>On Panameer since {SINCE(c.since)}</span>
            {c.website ? (
              <a href={/^https?:/.test(c.website) ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-magenta-dark hover:underline">
                {c.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              !buyer && <Missing>Add website</Missing>
            )}
            {!buyer && <span>{c.emailDomain ?? <Missing>Add email domain</Missing>}</span>}
            {!buyer && <span>{admin ? "You're an admin" : "You're a member"}</span>}
          </div>
          <p className="mt-3.5 max-w-[66ch] text-[14.5px] text-ink-2" data-company-description>
            {c.description ?? (buyer ? null : <Missing>Add a short description — what {c.name} does and for whom. Buyers read this on every proposal you send.</Missing>)}
          </p>
          {children}
        </main>

        {!buyer && (
          <div className="min-w-0 md:col-start-1 md:row-start-2">
            <Link href={`/companies/${c.id}`} className="mt-1 block bg-ink px-4 py-3 text-center text-[14px] font-bold text-surface hover:bg-ink-hover md:mt-7">
              How Buyers See Our Company
            </Link>
            <Link href="/invite-colleague" className="mt-2.5 block border border-ink px-4 py-3 text-center text-[14px] font-bold text-ink hover:bg-surface-hover">
              Invite Someone to {c.name}
            </Link>
            {visibility}
          </div>
        )}
      </div>
    </div>
  );
}
