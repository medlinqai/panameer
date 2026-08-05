import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * My Courses — a titled placeholder (WS1-B).
 *
 * The rail's submenu names this view, so it has to LAND somewhere. A 404 from
 * your own menu reads as a broken product; a titled empty state reads as one
 * that hasn't got there yet, which is the truth. The route, its title and its
 * gate are real — only the content is pending.
 */
export const metadata = { title: "My Courses · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="My Courses" />;
}
