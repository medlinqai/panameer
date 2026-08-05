import { redirect } from "next/navigation";

/**
 * Retired route (J2.4 WS-G/WS-H). Kept as a redirect rather than deleted: the
 * old path is in browser history, in the previous walk's notes and in earlier
 * briefs, and a 404 on a URL that worked yesterday reads as a regression rather
 * than a restructure — the same call `RETIRED_ADMIN_ROUTES` made for /admin.
 */
export default function RetiredSettingsRoute() {
  redirect("/settings/contact");
}
