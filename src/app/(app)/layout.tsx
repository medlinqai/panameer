import { MeProvider } from "@/components/MeProvider";
import { SideRail } from "@/components/SideRail";

/**
 * Authenticated app shell — the LEFT RAIL (brief_learn_v1 WS3).
 *
 * Replaces the top `Header`: the switch from the public top nav happens at
 * login, per design doc §6. These routes sit behind the proxy auth gate
 * (`src/proxy.ts`), so a session can be assumed; MeProvider loads /api/me for
 * the rail and the pages.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeProvider>
      <SideRail>{children}</SideRail>
    </MeProvider>
  );
}
