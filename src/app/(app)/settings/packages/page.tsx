import { permanentRedirect } from "next/navigation";

/**
 * RETIRED ROUTE — `/settings/packages` IS NOW `/my-services` (`P1-ALL-E533`).
 *
 * > **SCOTT, 2026-09-16:** *"The point is getting it OUT of Settings — it must
 * > lose the SETTINGS eyebrow and the settings tab row."*
 *
 * ⚠⚠ THIS WAS A NAVIGATION DEFECT, NOT A PREFERENCE. The top-level rail item
 * `Sell` landed on a page living inside `(app)/settings/`, so it inherited that
 * layout's `ConsoleHero eyebrow="Settings"` and its `SettingsTabs` row. A primary
 * selling surface wore the account section's clothes. Moving the FOLDER is what
 * fixes it — the chrome came from the layout, not from the page.
 *
 * ⚠ NOT `/service-products`, WHICH IS TAKEN. That path is a live PUBLIC marketing
 * page (`ErpPackages` at its own address, `P1-J0-E358`) and is in the
 * `public-routes` allowlist. ⚠⚠ `/my-services` also reads correctly: these are the
 * provider's OWN offerings, not the catalogue.
 *
 * ⚠ 308, not 307 — the address is in browser history, in bookmarks and in the
 * Account menu people have been using for weeks.
 */
export default function RetiredSettingsPackagesRoute() {
  permanentRedirect("/my-services");
}
