// Default Service Product covers (Scott 2026-10-12): a designed tile per type until the provider uploads a picture.
// Four looks the provider picks from: A Dark · B Light · C Color per Type · D Dark with the Type Name. Mockup: default_covers_mockup_2026-10-12.html.
export const COVER_STYLES = ["A", "B", "C", "D"] as const;
export type CoverStyle = (typeof COVER_STYLES)[number];
export const COVER_STYLE_LABEL: Record<CoverStyle, string> = { A: "Dark", B: "Light", C: "Color", D: "Labeled" };

const ICONS: Record<string, string> = {
  report: '<rect x="16" y="10" width="32" height="44" rx="2"/><path d="M23 22h18M23 30h18M23 38h11"/>',
  dashboard: '<rect x="8" y="12" width="48" height="36" rx="2"/><path d="M16 40v-8M26 40V24M36 40v-12M46 40V20"/><path d="M24 54h16"/>',
  integration: '<circle cx="18" cy="32" r="8"/><circle cx="46" cy="32" r="8"/><path d="M26 32h12M38 28l4 4-4 4"/>',
  conversion: '<ellipse cx="32" cy="16" rx="16" ry="6"/><path d="M16 16v28c0 3.3 7.2 6 16 6s16-2.7 16-6V16"/><path d="M16 30c0 3.3 7.2 6 16 6s16-2.7 16-6"/>',
  extension: '<rect x="8" y="12" width="14" height="12" rx="2"/><rect x="42" y="12" width="14" height="12" rx="2"/><rect x="25" y="40" width="14" height="12" rx="2"/><path d="M22 18h20M15 24v8h34v-8M32 32v8"/>',
  agent: '<rect x="14" y="18" width="36" height="28" rx="6"/><circle cx="25" cy="32" r="3"/><circle cx="39" cy="32" r="3"/><path d="M32 18v-7M28 11h8M10 28v8M54 28v8M26 40h12"/>',
  health: '<path d="M8 32h12l5-12 8 24 6-14 3 2h14"/><circle cx="32" cy="32" r="24" stroke-dasharray="3 5"/>',
  config: '<circle cx="32" cy="32" r="8"/><path d="M32 10v8M32 46v8M10 32h8M46 32h8M16.4 16.4l5.7 5.7M41.9 41.9l5.7 5.7M16.4 47.6l5.7-5.7M41.9 22.1l5.7-5.7"/>',
  other: '<path d="M32 12l6 13 14 2-10 10 3 14-13-7-13 7 3-14-10-10 14-2z"/>',
};
const ORDER = ["report", "dashboard", "integration", "conversion", "extension", "agent", "health", "config", "other"];
const COLORS = ["#272334", "#5C6485", "#4B3E6E", "#6B2F6A", "#181E3C", "#A61AA5", "#3A4166", "#2F2A45", "#7A1F86"];

function iconKey(typeName: string | null | undefined): string {
  const n = (typeName ?? "").toLowerCase();
  if (/dashboard|analytic/.test(n)) return "dashboard";
  if (/report/.test(n)) return "report";
  if (/integrat|interface|api/.test(n)) return "integration";
  if (/conver|data load|migrat/.test(n)) return "conversion";
  if (/extens|workflow/.test(n)) return "extension";
  if (/agent|\bai\b/.test(n)) return "agent";
  if (/health|assess|audit/.test(n)) return "health";
  if (/config|setup|set up/.test(n)) return "config";
  return "other";
}

export function coverSvg(typeName: string | null | undefined, style: string | null | undefined): string {
  const key = iconKey(typeName);
  const icon = ICONS[key];
  const s = (COVER_STYLES as readonly string[]).includes(style ?? "") ? (style as CoverStyle) : "A";
  if (s === "D") {
    const label = (typeName ?? "Service Product").split(" (")[0].split(" & ")[0].toUpperCase().slice(0, 16);
    return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" fill="#272334"/><g transform="translate(6 7) scale(.3)" fill="none" stroke="#D72CD6" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${icon}</g><text x="6" y="47" font-family="Montserrat,sans-serif" font-weight="800" font-size="${label.length < 11 ? 7 : 5.6}" fill="#fff" letter-spacing=".3">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text><rect x="6" y="52" width="14" height="1.6" fill="#D72CD6"/></svg>`;
  }
  const bg =
    s === "A"
      ? '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#272334"/><stop offset="1" stop-color="#3B3450"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><rect x="0" y="61" width="64" height="3" fill="#D72CD6"/>'
      : s === "B"
        ? '<rect width="64" height="64" fill="#F4F2F8"/><circle cx="54" cy="10" r="16" fill="#EBD3F0"/>'
        : `<rect width="64" height="64" fill="${COLORS[ORDER.indexOf(key)]}"/><path d="M0 64L64 0V64Z" fill="#FFFFFF" fill-opacity=".07"/>`;
  const stroke = s === "B" ? "#272334" : "#FFFFFF";
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${bg}<g transform="translate(14 14) scale(.5625)" fill="none" stroke="${stroke}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${icon}</g></svg>`;
}

/** The cover tile. Static SVG markup only (no user text except the type name, escaped). */
export function DefaultCover({ typeName, style, size = 72, className = "" }: { typeName: string | null | undefined; style: string | null | undefined; size?: number; className?: string }) {
  return <span aria-hidden className={`block flex-none overflow-hidden [&>svg]:h-full [&>svg]:w-full ${className}`} style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: coverSvg(typeName, style) }} />;
}
