import "./member-row.css";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { NO_RATE_PUBLISHED } from "@/lib/rate-display";
import type { PersonCard } from "@/lib/connections";
import { TitleAndCompany } from "@/components/company/CompanyLink";

export function MemberRow({
  person,
  rate,
  reason,
  profileId,
  children,
}: {
  person: PersonCard;
  rate?: string | null;
  profileId?: string | null;
  reason?: string;
  children?: React.ReactNode;
}) {
  const meta = person.title || person.company;

  return (
    <div className="pm-member-row flex flex-wrap items-center gap-3 border-t border-line py-5">
      {}
      <Avatar
        firstName={person.name.split(" ")[0] ?? ""}
        lastName={person.name.split(" ").slice(1).join(" ")}
        photoUrl={person.photoUrl}
        size={44}
      />
      <div className="min-w-[180px] flex-1">
        <p className="text-[15px] font-bold">
          {profileId ? (
            <Link href={`/providers/${profileId}`} className="hover:text-magenta">
              {person.name}
            </Link>
          ) : (
            person.name
          )}
        </p>
        {meta && (
          <p className="text-[13px] text-ink-2">
            <TitleAndCompany title={person.title} company={person.company} companyId={person.companyId} />
          </p>
        )}
        {reason && (
          <p className="mt-0.5 text-[12.5px] italic leading-snug text-ink-2">{reason}</p>
        )}
        {rate !== undefined && (
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            {rate ?? NO_RATE_PUBLISHED}
          </p>
        )}
      </div>
      {/* THE ACTIONS SLOT IS WRAPPED so the container query has something to */}
      {children && (
        <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
