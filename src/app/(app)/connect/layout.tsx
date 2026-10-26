import { AppFrame } from "@/components/home/AppFrame";

// WK-E004: Connect has no tab row — Home's tiles and What You Can Do open these pages; each says ← Connect and Also in Connect.
const PAGES: [string, string][] = [["Connections", "/connect/connections"], ["Recommendations", "/connect/recommendations"], ["Mentors", "/connect/mentors"], ["Groups", "/connect/groups"], ["Community", "/connect/community"], ["Leaders", "/connect/leaders"]];
export default function ConnectLayout({ children }: { children: React.ReactNode }) {
  return <div className="pm-white-page"><AppFrame app="Connect" home="/connect/home" base="/connect" pages={PAGES}>{children}</AppFrame></div>;
}
