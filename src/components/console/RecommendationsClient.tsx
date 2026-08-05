"use client";

import { useRouter } from "next/navigation";
import { RecommendationComposer } from "@/components/console/RecommendationComposer";

/**
 * The composer plus the record of what has been asked (J2.4 WS-F / E012).
 *
 * `router.refresh()` after a send rather than local list state: the server
 * component above owns the query, and re-running it is both less code and
 * incapable of disagreeing with the database. The list is small and the refresh
 * is cheap.
 */
export type RecommendationRow = {
  id: string;
  contact_name: string;
  contact_email: string;
  contact_off_platform: boolean;
  status: "SENT" | "SUBMITTED" | "DECLINED" | "EXPIRED";
  sent_at: string;
  responded_at: string | null;
  body: string | null;
  recommender_title: string | null;
  recommender_company: string | null;
};

const STATUS: Record<RecommendationRow["status"], { label: string; tone: string }> = {
  SENT: { label: "Awaiting reply", tone: "bg-amber-100 text-amber-800" },
  SUBMITTED: { label: "Recommended", tone: "bg-emerald-100 text-emerald-800" },
  DECLINED: { label: "Declined", tone: "bg-black/[0.06] text-ink-2" },
  EXPIRED: { label: "Expired", tone: "bg-black/[0.06] text-ink-2" },
};

export function RecommendationsClient({
  template,
  initialRows,
}: {
  template: string;
  initialRows: RecommendationRow[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <RecommendationComposer
        defaultMessage={template}
        onSent={() => router.refresh()}
      />

      <section className="rounded-brand border border-line bg-white p-5">
        <h2 className="font-display text-[16px] font-bold">Requests</h2>
        {initialRows.length === 0 ? (
          <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
            You haven&apos;t asked anyone yet. Requests you send show up here with
            their status, and anything written about you lands in your profile&apos;s
            Testimonials.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {initialRows.map((row) => {
              const status = STATUS[row.status];
              return (
                <li key={row.id} className="py-3.5">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[14.5px] font-bold">{row.contact_name}</span>
                    <span className="text-[13px] text-ink-2">{row.contact_email}</span>
                    <span
                      className={`ml-auto rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${status.tone}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  {row.body && (
                    <blockquote className="mt-2 border-l-[3px] border-magenta/40 pl-3 text-[14px] leading-relaxed text-ink-2">
                      {row.body}
                      {(row.recommender_title || row.recommender_company) && (
                        <footer className="mt-1.5 text-[12.5px] font-semibold not-italic">
                          {[row.recommender_title, row.recommender_company]
                            .filter(Boolean)
                            .join(", ")}
                        </footer>
                      )}
                    </blockquote>
                  )}
                  {row.status === "SENT" && row.contact_off_platform && (
                    <p className="mt-1.5 text-[12.5px] text-ink-2">
                      Not on Panameer — their email also invites them to join.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
