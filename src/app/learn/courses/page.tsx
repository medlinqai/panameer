import { ComingSoon } from "@/components/ComingSoon";

/**
 * All Courses — a titled placeholder (WS1-B).
 *
 * The rail's submenu names this view, so it has to LAND somewhere. A 404 from
 * your own menu reads as a broken product; a titled empty state reads as one
 * that hasn't got there yet, which is the truth. The route, its title and its
 * gate are real — only the content is pending.
 */
export const metadata = { title: "All Courses · Panameer" };

export default async function Page() {
  return <ComingSoon title="All Courses" />;
}
