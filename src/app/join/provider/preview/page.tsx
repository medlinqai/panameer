import { redirect } from "next/navigation";

/**
 * Retired by brief_S.
 *
 * The review moved INTO the wizard as step 12 (E035, one page, no scrolling)
 * and publishing now lands the provider on their live Profile View, which is
 * the dashboard (E037). This route only survives so older links and any
 * in-flight sessions don't 404.
 */
export default function ProviderPreviewRedirect() {
  redirect("/dashboard");
}
