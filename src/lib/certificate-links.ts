// L-E058/L-E059: certificate links — client-safe (no DB). The verify URL always uses NEXT_PUBLIC_APP_URL.
export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "");
// Links that leave Panameer (LinkedIn, shares, copied links) point at the live site even from a dev machine (Scott 2026-10-10).
const publicUrl = () => (/localhost|127\.0\.0\.1/.test(appUrl()) ? "https://app.panameer.com" : appUrl());
export const verifyUrl = (credentialId: string) => `${publicUrl()}/verify/${credentialId}`;
export const certificateImageUrl = (credentialId: string) => `${appUrl()}/api/certificates/${credentialId}/image`;

/** LinkedIn "Add license or certification", prefilled. Falls back to organizationName when the org id isn't set. */
export function linkedInAddUrl(c: { title: string; credentialId: string; issuedOn: Date | string }) {
  const d = new Date(c.issuedOn);
  // Panameer's public LinkedIn company id (Scott 2026-10-10). Default here so localhost links get the logo too.
  const org = process.env.NEXT_PUBLIC_LINKEDIN_ORG_ID?.trim() || "74523679";
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${c.title} – Panameer Certificate`,
    ...(org ? { organizationId: org } : { organizationName: "Panameer" }),
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: verifyUrl(c.credentialId),
    certId: c.credentialId,
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}

export const linkedInShareUrl = (credentialId: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl(credentialId))}`;

export const BRAND_GRADIENT = "linear-gradient(45deg, #140A2E 0%, #3D1A5B 40%, #7A1F86 75%, #C81E8C 100%)";
export const issuedLabel = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
