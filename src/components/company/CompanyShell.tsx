import Link from "next/link";
import type { ReactNode } from "react";
import type { CompanyView } from "@/lib/company-view";
import { CleanSide } from "@/components/profile/CleanSection";
import { CompanyLogoUpload } from "@/components/company/CompanyLogoUpload";
import "@/components/community/connect-profile.css";
import { CompanyLogoTile } from "@/components/company/CompanyLogoTile";
import { VerifiedTag } from "@/components/company/VerifiedTag";

// My Company layout (mockup my_company 2026-10-05), built like My Profile: logo column left, name + meta right.
// role "buyer" = the public, buyer-safe view: no readiness, no edit, no invite, no visibility.
export type CompanyRole = "admin" | "member" | "buyer";

const Missing = ({ children }: { children: ReactNode }) => <span className="italic text-ink-3">{children}</span>;
export const EditLink = ({ href, label = "Edit" }: { href: string; label?: string }) => (
  <Link href={href} scroll={false} className="ml-2 text-[11.5px] font-bold text-magenta-dark hover:underline">
    {label}
  </Link>
);

export function CompanyShell({ c, role, visibility, children }: { c: NonNullable<CompanyView>; role: CompanyRole; visibility?: ReactNode; children: ReactNode }) {
  const admin = role === "admin";
  const buyer = role === "buyer";
  const site = c.website?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <div className="pm-white-page mx-auto w-full max-w-[1010px] pb-14" data-company-page={role}>
      <div className="grid gap-[26px] md:grid-cols-[234px_minmax(0,1fr)] md:gap-x-[50px]">
        <aside className="grid min-w-0 grid-cols-[140px_minmax(0,1fr)] items-start gap-5 md:block">
          <div className="min-w-0">
            <div className="relative grid h-[140px] w-[140px] place-items-center border border-line bg-surface md:h-[234px] md:w-[234px]" data-logo-box>
              {c.logoUrl ? (
                <CompanyLogoTile src={c.logoUrl} alt={`${c.name} logo`} className="h-full w-full" />
              ) : (
                <span className="grid h-[72px] w-[72px] place-items-center bg-[linear-gradient(135deg,#2b2438,#5b4d78)] text-[28px] font-extrabold text-white md:h-[120px] md:w-[120px] md:text-[44px]">
                  {c.name.trim()[0]?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            {admin && (
              <div className="mt-2 text-right" data-logo-controls>
                <CompanyLogoUpload
                  companyId={c.id}
                  currentUrl={c.logoUrl}
                  className="text-[12px] font-bold text-magenta-dark underline underline-offset-2"
                  statusClassName="text-left"
                />
                <p className="mt-1 text-left text-[11.5px] text-ink-3">Best: 600 × 200 px, PNG, white or transparent background.</p>
              </div>
            )}
          </div>
          {!buyer && visibility && <div className="min-w-0 md:mt-6">{visibility}</div>}
        </aside>

        <main className="min-w-0">
          <h1 className="text-[30px] font-extrabold leading-tight">
            {c.name}
            <VerifiedTag companyId={c.id} />
          </h1>
          <p className="mt-1.5 flex flex-wrap gap-x-2 text-[14px] text-ink-2" data-company-meta>
            {site ? (
              <a href={`https://${site}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-magenta-dark hover:underline">
                {site}
              </a>
            ) : (
              !buyer && <Missing>Add website</Missing>
            )}
            <span aria-hidden>·</span>
            <span>
              {c.members} {c.members === 1 ? "person" : "people"}
            </span>
            {!buyer && (
              <>
                <span aria-hidden>·</span>
                <Link href={`/companies/${c.id}?preview=buyer`} data-see-as-buyer className="font-semibold text-magenta-dark underline underline-offset-2">
                  See as a buyer
                </Link>
              </>
            )}
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}
