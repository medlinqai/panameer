import "./member-row.css";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { NO_RATE_PUBLISHED } from "@/lib/rate-display";
import type { PersonCard } from "@/lib/connections";

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
  const meta = [person.title, person.company].filter(Boolean).join(" · ");

  return (
    <div className="pm-member-row flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4">
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
        {meta && <p className="text-[13px] text-ink-2">{meta}</p>}
        {reason && (
          <p className="mt-0.5 text-[12.5px] italic leading-snug text-ink-2">{reason}</p>
        )}
        {rate !== undefined && (
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            {rate ?? NO_RATE_PUBLISHED}
          </p>
        )}
      </div>
      {/* ⚠ THE ACTIONS SLOT IS WRAPPED so the container query has something to
          move. Wrapping is what lets three buttons drop together beneath the
          name while one stays inline. */}
      {children && (
        <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
