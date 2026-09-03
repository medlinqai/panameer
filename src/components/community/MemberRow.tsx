import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { NO_RATE_PUBLISHED } from "@/lib/rate-display";
import type { PersonCard } from "@/lib/connections";

/**
 * ONE MEMBER, RENDERED — the shared row for every `/community` block (`E374`).
 *
 * ⚠ IT HOLDS NO RULE. Name, photo, title, company and an optional rate string
 * that was ALREADY resolved by `lib/rate-display.ts`. This component never
 * decides which rate field to read and never formats money — passing it a
 * pre-resolved `rate` is what keeps the WS-0 rule in one asserted place.
 *
 * ⚠ `rate={undefined}` MEANS "THIS BLOCK DOES NOT SHOW RATES" and prints
 * nothing. `rate={null}` MEANS "THIS PERSON PUBLISHED NONE" and prints the one
 * honest line. They are different facts and they must not collapse — collapsing
 * them is how a `$0` gets invented.
 */
export function MemberRow({
  person,
  rate,
  reason,
  profileId,
  children,
}: {
  person: PersonCard;
  rate?: string | null;
  /** ⚠ ProviderProfile id. Absent = no profile page exists, so the name is not
      a link rather than a link to a 404. */
  profileId?: string | null;
  /** ⚠ A suggestion's reason, rendered verbatim. Never summarised or filtered. */
  reason?: string;
  children?: React.ReactNode;
}) {
  const meta = [person.title, person.company].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4">
      {/* ⚠ `Avatar` takes first/last, NOT a display name — checked against
          `components/Avatar.tsx:6` rather than guessed. `PersonCard` carries only
          the joined `name`, so it is split here for the initials fallback. */}
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
      {children}
    </div>
  );
}
