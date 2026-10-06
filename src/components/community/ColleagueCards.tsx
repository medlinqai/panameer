import Link from "next/link";
import { Face } from "@/components/community/Silhouette";
import { ConnectControls } from "@/components/community/ConnectControls";
import type { ColleagueCard, InvitedCard } from "@/lib/community-page";
import { CompanyLink } from "@/components/company/CompanyLink";

export function JoinedCard({ c }: { c: ColleagueCard }) {
  return (
    <div className="pm-cm-card">
      <Face photoUrl={c.photoUrl} size={44} />
      <div className="min-w-0 flex-1">
        <p className="pm-cm-name">
          {c.profileId ? (
            <Link href={`/providers/${c.profileId}`} className="pm-cm-open">
              {c.name}
            </Link>
          ) : (
            c.name
          )}
        </p>

        {/* THEIR OWN TITLE, VERBATIM AND NEVER RE-CASED ( , item 4). */}
        {c.title && <p className="pm-cm-title">{c.title}</p>}
        {c.company && (
          <p className="pm-cm-where">
            <CompanyLink id={c.companyId} name={c.company} />
          </p>
        )}
        {c.location && <p className="pm-cm-where">{c.location}</p>}

        <div className="pm-cm-actions mt-2">
          <ConnectControls toUserId={c.userId} relation="ACCEPTED" />
        </div>
      </div>
    </div>
  );
}

/** AN INVITED PERSON'S CARD: NAME, EMAIL, WHEN IT WAS SENT */
export function InvitedCardView({ i }: { i: InvitedCard }) {
  return (
    <div className="pm-cm-card pm-cm-card-invited">
      <Face photoUrl={null} size={44} />
      <div className="min-w-0 flex-1">
        {/* The name may be null — the invite holds it only if it was typed. */}
        <p className="pm-cm-name">{i.name ?? i.email}</p>
        {i.name && <p className="pm-cm-email">{i.email}</p>}
        <p className="pm-cm-sent">Invited {sentLabel(i.sentAt)}</p>

        <div className="pm-cm-actions mt-2 flex gap-2">
          {/* they are rendered DISABLED because neither endpoint exists. */}
          <button
            type="button"
            disabled
            // RULING 18 + : this control is DISABLED and its tooltip named a
            title="Nudging an invitation is not available."
            className="border border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink-3"
          >
            Nudge
          </button>
          <button
            type="button"
            disabled
            /* SUPERSEDED (`E164`): //   "Resending an invitation isn't built yet." */
            title="Resending an invitation is not available."
            className="border border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink-3"
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}

/** THIS NEARLY SHIPPED MISSING, AND `check:connect-walk` CAUGHT IT. The WS-C */
export function WaitingOnYou({
  rows,
}: {
  rows: { connectionId: string; userId: string; name: string; title: string | null; photoUrl: string | null }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-[17px] font-bold">Waiting on You</h2>
      <div className="pm-cm-cards">
        {rows.map((r) => (
          <div key={r.connectionId} className="pm-cm-card">
            <Face photoUrl={r.photoUrl} size={44} />
            <div className="min-w-0 flex-1">
              <p className="pm-cm-name">{r.name}</p>
              {r.title && <p className="pm-cm-title">{r.title}</p>}
              <div className="pm-cm-actions mt-2">
                {/* hidden menu item. Nothing is destroyed: the connection row is */}
                <ConnectControls
                  toUserId={r.userId}
                  relation="PENDING"
                  incomingConnectionId={r.connectionId}
                  showDecline
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** A relative day count, computed on the SERVER from a real column. */
function sentLabel(sentAt: Date): string {
  const days = Math.floor((Date.now() - sentAt.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}
