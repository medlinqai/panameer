import {
  AlignLeft,
  BarChart3,
  Bell,
  FileText,
  LayoutGrid,
  LifeBuoy,
  PenLine,
  Search,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const RAIL_GENERAL: LucideIcon[] = [
  LayoutGrid,
  BarChart3,
  AlignLeft,
  Sparkles,
  FileText,
];
const RAIL_SUPPORT: LucideIcon[] = [LifeBuoy, Settings];

function RailTile({ Icon, on = false }: { Icon: LucideIcon; on?: boolean }) {
  return (
    <span className={"ash-ri" + (on ? " is-on" : "")}>
      <Icon className="ash-sv" strokeWidth={1.8} aria-hidden />
    </span>
  );
}

export function AppShot({
  railActive,
  children,
}: {
  /** Index into the rail's five General tiles — which screen this shot shows. */
  railActive: number;
  children: React.ReactNode;
}) {
  return (
    <div className="ash">
      {/* browser chrome — pure decoration, hidden from AT entirely */}
      <div className="ash-chrome" aria-hidden>
        <span className="ash-dot" style={{ background: "#ff5f57" }} />
        <span className="ash-dot" style={{ background: "#febc2e" }} />
        <span className="ash-dot" style={{ background: "#28c840" }} />
        <span className="ash-url" />
      </div>

      <div className="ash-app">
        {}
        <div className="ash-rail" aria-hidden>
          <span className="ash-rlogo">
            <LayoutGrid className="ash-sv" strokeWidth={2} aria-hidden />
          </span>
          <span className="ash-rlab">General</span>
          {RAIL_GENERAL.map((Icon, i) => (
            <RailTile Icon={Icon} on={i === railActive} key={i} />
          ))}
          <span className="ash-rlab">Support</span>
          {RAIL_SUPPORT.map((Icon, i) => (
            <RailTile Icon={Icon} key={i} />
          ))}
        </div>

        {/* `min-width:0` in the stylesheet — the grid-blowout guard belongs here */}
        <div className="ash-side">
          <div className="ash-top">
            <div className="ash-search" aria-hidden>
              <Search className="ash-sv" strokeWidth={1.9} aria-hidden />
              <span>Search here…</span>
              {}
              <span className="ash-kbd">/</span>
            </div>
            <div className="ash-tops">
              <span className="ash-ico" aria-hidden>
                <Bell className="ash-sv" strokeWidth={1.8} aria-hidden />
                <span className="ash-dotr" />
              </span>
              <span className="ash-ico is-mag" aria-hidden>
                <PenLine className="ash-sv" strokeWidth={1.9} aria-hidden />
              </span>
              <div className="ash-who">
                <span className="ash-av" aria-hidden>
                  PI
                </span>
                {}
                <span className="ash-whot">
                  <b>Paul Ingrao</b>
                  <span>Ingrao Dental Services</span>
                </span>
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
