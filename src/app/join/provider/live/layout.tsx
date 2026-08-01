import { MeProvider } from "@/components/MeProvider";
import { SideRail } from "@/components/SideRail";

/**
 * The "You're live" page runs in the APP shell, not the wizard's.
 *
 * This is where the two-shell switch happens (brief_provider_home_page_v2 WS1):
 * everything before it is onboarding chrome, everything after it is the app.
 * Putting the rail here is what makes the page read as "you have arrived"
 * rather than as one more wizard step.
 */
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <SideRail>{children}</SideRail>
    </MeProvider>
  );
}
