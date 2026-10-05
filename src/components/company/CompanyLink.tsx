import Link from "next/link";
import type { ReactNode } from "react";

// Every company name links to its page (Scott 2026-10-05). /companies/[id] sends a member of that company
// to their own Company → Overview, so one href serves both.
export const companyHref = (id: string) => `/companies/${id}`;

export function CompanyLink({ id, name, className = "", children }: { id: string | null | undefined; name: string; className?: string; children?: ReactNode }) {
  if (!id) return <>{children ?? name}</>;
  return (
    <Link href={companyHref(id)} data-company-link className={`hover:underline ${className}`}>
      {children ?? name}
    </Link>
  );
}

/** "Title · Company" with the company linked — the member-card meta line. */
export function TitleAndCompany({ title, company, companyId }: { title: string | null; company: string | null; companyId: string | null | undefined }) {
  return (
    <>
      {title}
      {title && company && " · "}
      {company && <CompanyLink id={companyId} name={company} />}
    </>
  );
}
