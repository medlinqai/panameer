import { permanentRedirect } from "next/navigation";

// Account area (Scott 2026-10-05): /settings opens on its first tab (next.config 308s it too).
export default function SettingsIndex() {
  permanentRedirect("/settings/notifications");
}
