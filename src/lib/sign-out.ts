import { signOut } from "next-auth/react";

// One sign-out for every button: expire all session-cookie variants server-side, let NextAuth clear its own,
// then REPLACE the page with /login so Back can't show the signed-in app.
export async function signOutEverywhere() {
  await fetch("/api/account/sign-out", { method: "POST", credentials: "same-origin" }).catch(() => null);
  await signOut({ redirect: false }).catch(() => null);
  window.location.replace("/login");
}
