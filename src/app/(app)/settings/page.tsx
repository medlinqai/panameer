import { redirect } from "next/navigation";

/**
 * /settings lands on Membership (J2.4 WS-G / E013).
 *
 * It used to land on the profile form. Membership answers "what am I paying for
 * and what does it get me", which is the question people arrive at Settings
 * holding — whereas opening on a form made the whole area read as a place you
 * go to fill something in rather than a place you go to check something.
 */
export default function SettingsIndex() {
  redirect("/settings/membership");
}
