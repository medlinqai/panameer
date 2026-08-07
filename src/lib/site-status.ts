/**
 * IS PANAMEER LAUNCHED YET? (brief_catalog_renames_and_dev_banner WS-B)
 *
 * One flag, read by the "under development" banner and available to anything
 * else that needs to behave differently before launch. It lives in its own
 * module rather than in `lib/env.ts` because it has to be readable from CLIENT
 * components, and `env.ts` pulls zod and the full server schema — including the
 * names of secrets — into whatever bundle imports it.
 *
 * ⚠ AT LAUNCH: change the default below to "live", or set
 * NEXT_PUBLIC_SITE_STATUS=live in the production environment. Either one removes
 * the banner everywhere; there is no second place to edit.
 *
 * DEFAULT IS "development", ON PURPOSE AND WITH A COST. Defaulting the other way
 * would mean a forgotten env var silently ships a launched-looking site while it
 * is still being rebuilt nightly, which is the failure that actually hurts —
 * real people are already reaching sign-up. Defaulting this way means a
 * forgotten flag ships a slightly embarrassing banner on launch day. The banner
 * is the cheaper mistake, but it IS a mistake, so it goes on the launch
 * checklist rather than relying on anyone noticing it.
 *
 * `NEXT_PUBLIC_` is inlined at BUILD time, so flipping it in a hosting
 * dashboard needs a redeploy, not just a restart.
 */
export type SiteStatus = "development" | "live";

export const SITE_STATUS: SiteStatus =
  process.env.NEXT_PUBLIC_SITE_STATUS === "live" ? "live" : "development";

/** True while the site is pre-launch — the banner's only condition. */
export const IS_PRELAUNCH = SITE_STATUS === "development";
