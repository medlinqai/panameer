import { guardPage } from "@/lib/guard";
import { defaultMessage, listRecommendations } from "@/lib/recommendations";
import { RecommendationsClient } from "@/components/console/RecommendationsClient";

/**
 * REQUEST RECOMMENDATIONS (J2.4 WS-F / E012) — built from empty.
 *
 * Server component for the read; the composer and the list live in a client
 * component below it so sending refreshes the list without a round trip through
 * the router. Everything is owner-scoped in the lib — nothing on this page
 * names a record.
 */
export const metadata = { title: "Request Recommendations · Panameer" };

export default async function RecommendationsPage() {
  const viewer = await guardPage("canProvideServices");
  const { providerFirstName, rows } = await listRecommendations(viewer);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        A recommendation from someone you&apos;ve worked with does more for a
        buyer&apos;s confidence than anything you can write about yourself. Ask
        the people who already know your work.
      </p>
      <RecommendationsClient
        template={defaultMessage(providerFirstName)}
        initialRows={rows}
      />
    </div>
  );
}
