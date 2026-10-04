export type SiteStatus = "development" | "live";

export const SITE_STATUS: SiteStatus =
  process.env.NEXT_PUBLIC_SITE_STATUS === "live" ? "live" : "development";

/** True while the site is pre-launch — the banner's only condition. */
export const IS_PRELAUNCH = SITE_STATUS === "development";
