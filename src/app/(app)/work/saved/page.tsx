import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * My Work Requests (Saved) — a titled placeholder (WS1-B).
 *
 * The rail's submenu names this view, so it has to LAND somewhere. A 404 from
 * your own menu reads as a broken product; a titled empty state reads as one
 * that hasn't got there yet, which is the truth. The route, its title and its
 * gate are real — only the content is pending.
 */
export const metadata = { title: "My Work Requests (Saved) · Panameer" };

export default async function Page() {
  await guardPage("canProvideServices");
  return <ComingSoon title="My Work Requests (Saved)" />;
}
