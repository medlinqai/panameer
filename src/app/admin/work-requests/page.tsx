import { SpecPage } from "@/components/console/SpecPage";

/**
 * Admin console page, built from its 2.5 deck slide via ADMIN_PAGES.
 *
 * TODO(moderation): removing a Work Request is not built — nothing here or
 * anywhere else takes a request down. When it is, the remove action sends
 * `workRequestRemovedTemplate` from
 * `@/lib/email/templates/work-request-removed` (built and unit-tested; see
 * `npm run check:email`). It takes the reviewer's reasons so the notice says
 * what was actually wrong rather than only quoting the Terms.
 */
export default function Page() {
  return <SpecPage slug="work-requests" />;
}
