// Scott 10-27: after sign-in everyone goes to /dashboard — except a sign-in that started from a link in an email or a
// notification. Those links carry from=email / from=notification, and only they keep their callbackUrl.
export const FROM_MARKS = ["email", "notification"] as const;

/** True when a (relative) URL carries from=email or from=notification. */
export function isMarkedReturn(url: string | null | undefined): boolean {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return false;
  const q = url.split("#")[0].split("?")[1];
  return !!q && (FROM_MARKS as readonly string[]).includes(new URLSearchParams(q).get("from") ?? "");
}

/** Where to go after sign-in: the marked link, else /dashboard. */
export const afterSignIn = (callbackUrl: string | null | undefined) => (isMarkedReturn(callbackUrl) ? callbackUrl! : "/dashboard");

/** Add from=… to an app link (relative, or on one of the given app origins); other links are left alone. */
export function markLink(href: string, from: (typeof FROM_MARKS)[number], origins: string[] = []): string {
  const origin = origins.find((o) => href.startsWith(o));
  if (!href.startsWith("/") && !origin) return href;
  if (href.startsWith("//") || /[?&]from=/.test(href)) return href;
  const [base, hash] = href.split("#");
  return `${base}${base.includes("?") ? "&" : "?"}from=${from}${hash !== undefined ? `#${hash}` : ""}`;
}
