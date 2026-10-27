import type { ReactNode } from "react";

// PA-E001: Product Type / Category art — one family of line illustrations (ink stroke 2.5, magenta accents, 64-unit grid,
// same padding) on a soft magenta-tinted square. Matched by Product Type name; a type nobody drew falls back to its Category.
// Pure SVG, no network, light + dark.
type Motif = () => ReactNode;
const A = "fill-magenta"; // accent fill
const As = "stroke-magenta"; // accent stroke

const M: Record<string, Motif> = {
  agent: () => (<><rect x="16" y="20" width="32" height="26" rx="7" /><path d="M32 20v-7" /><circle cx="32" cy="11" r="3" className={A} /><circle cx="25" cy="32" r="3.5" className={A} /><circle cx="39" cy="32" r="3.5" className={A} /><path d="M26 40h12M12 30v8M52 30v8" /></>),
  report: () => (<><path d="M18 10h20l10 10v34H18z" /><path d="M38 10v10h10" /><path d="M24 30h16M24 37h16" /><rect x="24" y="43" width="5" height="6" className={A} /><rect x="32" y="40" width="5" height="9" className={A} /></>),
  dashboard: () => (<><rect x="9" y="13" width="46" height="32" rx="3" /><path d="M24 52h16M32 45v7" /><rect x="15" y="30" width="5" height="9" className={A} /><rect x="23" y="24" width="5" height="15" className={A} /><circle cx="42" cy="29" r="7" /><path d="M42 22v7h7" className={As} /></>),
  integration: () => (<><rect x="8" y="22" width="16" height="20" rx="3" /><rect x="40" y="22" width="16" height="20" rx="3" /><path d="M24 28h16M34 23l6 5-6 5" /><path d="M40 37H24M30 32l-6 5 6 5" className={As} /></>),
  puzzle: () => (<><path d="M14 22h10a5 5 0 1 1 10 0h10v10a5 5 0 1 1 0 10v10H14V42a5 5 0 1 0 0-10z" /><circle cx="29" cy="37" r="4" className={A} /></>),
  data: () => (<><ellipse cx="26" cy="16" rx="13" ry="5" /><path d="M13 16v30c0 3 6 5 13 5s13-2 13-5V16M13 31c0 3 6 5 13 5s13-2 13-5" /><path d="M44 30h10M49 25l5 5-5 5" className={As} /></>),
  check: () => (<><rect x="16" y="12" width="32" height="42" rx="3" /><rect x="25" y="8" width="14" height="8" rx="2" /><path d="M23 33l6 6 12-13" className={As} /></>),
  gear: () => (<><circle cx="32" cy="32" r="8" className={A} /><path d="M32 10v7M32 47v7M10 32h7M47 32h7M16.5 16.5l5 5M42.5 42.5l5 5M16.5 47.5l5-5M42.5 21.5l5-5" /><circle cx="32" cy="32" r="15" /></>),
  key: () => (<><circle cx="22" cy="32" r="10" /><circle cx="22" cy="32" r="3.5" className={A} /><path d="M32 32h22M46 32v7M52 32v5" /></>),
  box: () => (<><path d="M10 22l22-10 22 10v22L32 54 10 44z" /><path d="M10 22l22 10 22-10M32 32v22" /><path d="M21 17l22 10" className={As} /></>),
  cards: () => (<><rect x="10" y="18" width="34" height="22" rx="2" /><rect x="20" y="26" width="34" height="22" rx="2" className="fill-white dark:fill-[#1b1726]" /><circle cx="29" cy="37" r="4" className={A} /><path d="M37 34h11M37 40h8" /></>),
  banner: () => (<><path d="M14 10v46M50 10v46" /><path d="M14 14h36v20H14z" /><path d="M20 20h24M20 27h14" className={As} /></>),
  brochure: () => (<><path d="M10 16l14-4 16 4 14-4v38l-14 4-16-4-14 4z" /><path d="M24 12v38M40 16v38" /><circle cx="17" cy="26" r="3" className={A} /><path d="M29 24h7M29 30h7M45 24h5" /></>),
  booklet: () => (<><path d="M32 16c-6-4-14-5-22-4v36c8-1 16 0 22 4 6-4 14-5 22-4V12c-8-1-16 0-22 4z" /><path d="M32 16v36" /><path d="M16 24h10M38 24h10" className={As} /></>),
  envelope: () => (<><rect x="9" y="17" width="46" height="30" rx="3" /><path d="M9 20l23 15 23-15" /><circle cx="49" cy="17" r="5" className={A} /></>),
  poster: () => (<><rect x="15" y="9" width="34" height="46" rx="2" /><circle cx="27" cy="24" r="5" className={A} /><path d="M15 45l12-12 9 9 6-6 7 7" /></>),
  truck: () => (<><path d="M6 18h32v24H6zM38 26h10l8 8v8H38z" /><circle cx="17" cy="45" r="5" className={A} /><circle cx="46" cy="45" r="5" className={A} /></>),
  sign: () => (<><path d="M32 8v48" /><path d="M14 14h30l6 6-6 6H14z" /><path d="M50 32H20l-6 6 6 6h30z" className={As} /></>),
  tag: () => (<><path d="M10 12h22l22 22-20 20-24-24z" /><circle cx="21" cy="23" r="4" className={A} /></>),
  shirt: () => (<><path d="M22 10l-12 8 6 10 5-3v29h22V25l5 3 6-10-12-8c-2 4-6 6-10 6s-8-2-10-6z" /><circle cx="32" cy="34" r="4" className={A} /></>),
  gift: () => (<><rect x="12" y="24" width="40" height="30" rx="2" /><path d="M10 18h44v8H10zM32 18v36" /><path d="M32 18c-4-8-14-8-12-1M32 18c4-8 14-8 12-1" className={As} /></>),
  booth: () => (<><rect x="10" y="10" width="44" height="24" rx="2" /><path d="M10 50h44M16 34v16M48 34v16" /><path d="M18 38h28v8H18z" className={As} /><circle cx="32" cy="22" r="5" className={A} /></>),
  search: () => (<><circle cx="28" cy="28" r="15" /><path d="M39 39l14 14" /><path d="M21 33v-5M28 33v-9M35 33v-3" className={As} /></>),
  megaphone: () => (<><path d="M12 26v12h8l20 12V14L20 26z" /><path d="M20 38l3 12h6l-3-12" /><path d="M48 24c3 3 3 13 0 16M53 20c5 6 5 18 0 24" className={As} /></>),
  social: () => (<><path d="M10 14h30v20H22l-8 7v-7h-4z" /><path d="M44 24h10v20h-4v7l-8-7H28v-6" /><circle cx="18" cy="24" r="2.5" className={A} /><circle cx="25" cy="24" r="2.5" className={A} /><circle cx="32" cy="24" r="2.5" className={A} /></>),
  video: () => (<><rect x="8" y="18" width="34" height="28" rx="4" /><path d="M42 28l14-8v24l-14-8" /><path d="M21 26v12l10-6z" className={A} /></>),
  camera: () => (<><path d="M8 22h12l4-6h16l4 6h12v28H8z" /><circle cx="32" cy="35" r="9" /><circle cx="32" cy="35" r="4" className={A} /></>),
  pen: () => (<><path d="M42 10l12 12-28 28H14V38z" /><path d="M36 16l12 12" /><path d="M14 56h22" className={As} /></>),
  brand: () => (<><circle cx="32" cy="32" r="21" /><path d="M32 18l4 9 10 1-7 7 2 10-9-5-9 5 2-10-7-7 10-1z" className={A} /></>),
  board: () => (<><rect x="10" y="10" width="44" height="30" rx="2" /><path d="M32 40v8M22 56l10-8 10 8" /><path d="M17 33l9-9 7 6 13-12" className={As} /></>),
  browser: () => (<><rect x="8" y="12" width="48" height="40" rx="3" /><path d="M8 21h48" /><circle cx="14" cy="16.5" r="1.6" className={A} /><circle cx="19" cy="16.5" r="1.6" className={A} /><rect x="15" y="28" width="16" height="16" className={A} /><path d="M36 30h13M36 36h13M36 42h9" /></>),
  calculator: () => (<><rect x="16" y="8" width="32" height="48" rx="4" /><rect x="21" y="14" width="22" height="9" className={A} /><path d="M23 31h4M30 31h4M37 31h4M23 38h4M30 38h4M37 38h4M23 45h4M30 45h4M37 45h4" /></>),
  people: () => (<><circle cx="24" cy="22" r="7" /><path d="M10 50c0-9 6-15 14-15s14 6 14 15" /><circle cx="43" cy="24" r="6" className={A} /><path d="M38 36c9-1 16 4 16 14" /></>),
  docs: () => (<><rect x="18" y="14" width="30" height="40" rx="2" /><path d="M14 46V10h28" /><path d="M24 26h18M24 32h18M24 38h12" /><path d="M10 44h44" className={As} /></>),
  globe: () => (<><circle cx="32" cy="32" r="21" /><path d="M11 32h42M32 11c-8 8-8 34 0 42M32 11c8 8 8 34 0 42" /><path d="M15 21h34M15 43h34" className={As} /></>),
  laptop: () => (<><rect x="14" y="14" width="36" height="24" rx="2" /><path d="M8 46h48l-4 6H12z" /><path d="M24 30l5-6 5 4 6-6" className={As} /></>),
  network: () => (<><circle cx="32" cy="14" r="5" className={A} /><circle cx="14" cy="48" r="5" /><circle cx="50" cy="48" r="5" /><circle cx="32" cy="38" r="5" /><path d="M32 19v14M28 41l-10 4M36 41l10 4" /></>),
  shield: () => (<><path d="M32 8l20 7v14c0 13-8 22-20 27-12-5-20-14-20-27V15z" /><path d="M23 31l7 7 12-13" className={As} /></>),
  cloud: () => (<><path d="M20 46h26a10 10 0 0 0 0-20 14 14 0 0 0-27-3 10 10 0 0 0 1 23z" /><path d="M32 30v12M27 35l5-5 5 5" className={As} /></>),
  phone: () => (<><path d="M18 10h8l4 11-6 4c3 7 8 12 15 15l4-6 11 4v8c0 3-3 6-6 6C27 52 12 37 12 16c0-3 3-6 6-6z" /><path d="M40 12c6 1 11 6 12 12M40 19c3 1 5 3 6 6" className={As} /></>),
  clean: () => (<><path d="M24 22h12v8l6 4v20H18V34l6-4z" /><path d="M24 22v-8h10l6 4h-6" /><circle cx="46" cy="12" r="2" className={A} /><circle cx="52" cy="18" r="2" className={A} /><circle cx="50" cy="8" r="1.6" className={A} /></>),
  leaf: () => (<><path d="M14 50C14 26 28 12 52 12c0 24-14 38-38 38z" /><path d="M14 50l24-24" className={As} /></>),
  snow: () => (<><path d="M32 8v48M11 20l42 24M11 44l42-24" /><path d="M26 12l6 6 6-6M26 52l6-6 6 6" className={As} /></>),
  wrench: () => (<><path d="M44 8a12 12 0 0 0-11 16L10 47l7 7 23-23a12 12 0 0 0 16-11l-7 5-6-6z" /><circle cx="15" cy="49" r="2" className={A} /></>),
  bolt: () => (<><path d="M36 6L14 36h16l-4 22 24-32H34z" className={A} /><path d="M36 6L14 36h16l-4 22 24-32H34z" /></>),
  drop: () => (<><path d="M32 8c10 13 16 22 16 30a16 16 0 0 1-32 0c0-8 6-17 16-30z" /><path d="M24 40a8 8 0 0 0 8 8" className={As} /></>),
  hvac: () => (<><circle cx="32" cy="32" r="21" /><circle cx="32" cy="32" r="3" className={A} /><path d="M32 29c-2-8 4-14 10-10M35 33c8-2 14 4 10 10M29 34c2 8-4 14-10 10M29 30c-8 2-14-4-10-10" /></>),
  cctv: () => (<><path d="M10 20l34 8-4 12-34-8z" /><path d="M40 40l4 8h10M12 32v18" /><circle cx="18" cy="26" r="2.5" className={A} /></>),
  bin: () => (<><path d="M14 18h36M26 18v-6h12v6M18 18l3 36h22l3-36" /><path d="M28 26v20M36 26v20" className={As} /></>),
  hazard: () => (<><path d="M32 8l24 44H8z" /><path d="M32 24v14" /><circle cx="32" cy="45" r="2.5" className={A} /></>),
  pallet: () => (<><rect x="12" y="10" width="18" height="18" /><rect x="34" y="10" width="18" height="18" /><rect x="22" y="28" width="20" height="16" className="fill-[#f6d5f3] dark:fill-magenta/30" /><path d="M8 48h48M12 48v6M32 48v6M52 48v6" /></>),
  house: () => (<><path d="M8 30L32 10l24 20" /><path d="M14 26v28h36V26" /><rect x="27" y="38" width="10" height="16" className={A} /></>),
  car: () => (<><path d="M8 40v-8l6-12h36l6 12v8z" /><path d="M14 32h36" /><circle cx="19" cy="42" r="5" className={A} /><circle cx="45" cy="42" r="5" className={A} /></>),
  calendar: () => (<><rect x="10" y="14" width="44" height="40" rx="3" /><path d="M10 24h44M22 8v10M42 8v10" /><rect x="34" y="34" width="10" height="10" className={A} /></>),
  plane: () => (<><path d="M30 8c2 0 4 2 4 6v12l20 12v6l-20-6v10l6 5v4l-10-3-10 3v-4l6-5V38L6 44v-6l20-12V14c0-4 2-6 4-6z" /><circle cx="32" cy="20" r="2" className={A} /></>),
  food: () => (<><path d="M20 8v18a6 6 0 0 0 12 0V8M26 8v48" /><path d="M44 8c-6 4-6 18 0 22v26" className={As} /></>),
  target: () => (<><circle cx="32" cy="32" r="21" /><circle cx="32" cy="32" r="12" /><circle cx="32" cy="32" r="4" className={A} /><path d="M32 32l18-18M44 14h6v6" /></>),
  cap: () => (<><path d="M4 26l28-12 28 12-28 12z" /><path d="M16 32v12c8 6 24 6 32 0V32" /><path d="M56 28v14" className={As} /><circle cx="56" cy="44" r="2.5" className={A} /></>),
  bulb: () => (<><path d="M32 8a16 16 0 0 0-9 29v7h18v-7a16 16 0 0 0-9-29z" /><path d="M25 50h14M27 56h10" /><path d="M28 28l4 6 4-6" className={As} /></>),
  legal: () => (<><path d="M32 10v44M16 54h32M14 18h36" /><path d="M14 18l-6 14h12zM50 18l-6 14h12z" /><path d="M8 32a6 6 0 0 0 12 0M44 32a6 6 0 0 0 12 0" className={As} /></>),
  recruit: () => (<><circle cx="24" cy="22" r="8" /><path d="M8 52c0-10 7-17 16-17 4 0 7 1 10 3" /><circle cx="44" cy="42" r="8" /><path d="M50 48l7 7" className={As} /></>),
  building: () => (<><rect x="14" y="10" width="26" height="44" /><path d="M40 24h12v30H40" /><path d="M20 18h6M28 18h6M20 26h6M28 26h6M20 34h6M28 34h6" /><rect x="23" y="44" width="8" height="10" className={A} /></>),
  heart: () => (<><path d="M32 54C14 42 8 32 8 23a11 11 0 0 1 24-5 11 11 0 0 1 24 5c0 9-6 19-24 31z" /><path d="M16 32h8l4-6 5 12 4-6h10" className={As} /></>),
  briefcase: () => (<><rect x="8" y="20" width="48" height="32" rx="3" /><path d="M24 20v-6h16v6M8 34h48" /><rect x="28" y="30" width="8" height="8" className={A} /></>),
  clock: () => (<><circle cx="32" cy="32" r="21" /><path d="M32 18v14l10 6" className={As} /><circle cx="32" cy="32" r="2.5" className={A} /></>),
  print: () => (<><path d="M18 22V10h28v12" /><rect x="8" y="22" width="48" height="20" rx="3" /><path d="M18 36h28v18H18z" /><path d="M24 44h16M24 49h10" className={As} /><circle cx="48" cy="29" r="2" className={A} /></>),
  palette: () => (<><path d="M32 8a24 24 0 0 0 0 48c4 0 5-3 3-6s0-6 4-6h6a11 11 0 0 0 11-11C56 19 45 8 32 8z" /><circle cx="22" cy="26" r="3.5" className={A} /><circle cx="32" cy="19" r="3.5" className={A} /><circle cx="43" cy="25" r="3.5" className={A} /></>),
};

// Product Type name → motif (first match wins). Kept broad so new types land somewhere sensible.
const RULES: [RegExp, keyof typeof M][] = [
  // Specific things first…
  [/ai agent|agent|chatbot|assistant|receptionist/i, "agent"],
  [/dashboard/i, "dashboard"],
  [/integration|interface/i, "integration"],
  [/extension|add-on|module/i, "puzzle"],
  [/business card/i, "cards"],
  [/banner|poster/i, "banner"],
  [/brochure|flyer/i, "brochure"],
  [/booklet|catalog/i, "booklet"],
  [/envelope|letterhead|direct mail/i, "envelope"],
  [/\bsign(age|s)?\b/i, "sign"],
  [/label|sticker|decal/i, "tag"],
  [/apparel|shirt/i, "shirt"],
  [/merchandise|giveaway|gift/i, "gift"],
  [/trade show|booth|display/i, "booth"],
  [/seo/i, "search"],
  [/\bads\b|media buy|campaign|press release|promo/i, "megaphone"],
  [/social/i, "social"],
  [/video|clips|shoot/i, "video"],
  [/photo/i, "camera"],
  [/copy|article|blog|writing/i, "pen"],
  [/logo|brand/i, "brand"],
  [/website|landing page|web/i, "browser"],
  [/bookkeeping|tax|close|cfo|accounting/i, "calculator"],
  [/payroll|employer of record|onboarding|staffing|placement/i, "people"],
  [/translat|interpreter/i, "globe"],
  [/laptop|device|help desk|managed it|microsoft|google/i, "laptop"],
  [/network|wiring|drop|internet/i, "network"],
  [/security|penetration|soc 2|compliance|guard|alarm/i, "shield"],
  [/cloud/i, "cloud"],
  [/voip|phone/i, "phone"],
  [/camera|cctv/i, "cctv"],
  [/door/i, "key"],
  [/clean|wash|purge/i, "clean"],
  [/mow|lawn|grounds|irrigation|treatment/i, "leaf"],
  [/snow/i, "snow"],
  [/hvac|tune-up|filter/i, "hvac"],
  [/light|panel|electric/i, "bolt"],
  [/drain|water heater|plumb/i, "drop"],
  [/repair|maintenance|handyman|drywall|paint|diagnostic|oil change/i, "wrench"],
  [/dumpster|haul|shred|trash/i, "bin"],
  [/hazard|environmental/i, "hazard"],
  [/vehicle wrap|truckload|ltl|freight|delivery|route|drayage|lane|load/i, "truck"],
  [/pallet|storage|pick-pack|warehouse/i, "pallet"],
  [/move|relocation/i, "house"],
  [/rental|lease|vehicle|car\b/i, "car"],
  [/event|coordination|meeting room/i, "calendar"],
  [/travel|trip/i, "plane"],
  [/catering|food/i, "food"],
  [/lead/i, "target"],
  [/course|training|exam|lesson|quiz|test pack|practice test|job aids|train/i, "cap"],
  [/coach|mentor|session|leadership|fractional/i, "bulb"],
  [/contract|entity|legal|nda|agreement/i, "legal"],
  [/search|recruit|hiring|background check|posting/i, "recruit"],
  [/build-out|office/i, "building"],
  [/report|analytics|white paper|case study/i, "report"],
  [/conversion|data load|data cleanup|migration/i, "data"],
  [/scan|records|document|handbook|job description/i, "docs"],
  // …generic words last.
  [/workshop|strategy|plan|presentation/i, "board"],
  [/health check|assessment|audit|review|inspection|check-up|readiness|feasibility|evaluation/i, "check"],
  [/license|subscription|access/i, "key"],
  [/configuration|setup|implementation|install/i, "gear"],
  [/package|boxes|custom box/i, "box"],
];

const CATEGORY: [RegExp, keyof typeof M][] = [
  [/erp|oracle/i, "dashboard"], [/ai|automation/i, "agent"], [/website/i, "browser"], [/marketing|creative/i, "megaphone"],
  [/printing|signs/i, "print"], [/finance|admin/i, "calculator"], [/^it$|technology/i, "laptop"], [/telecom/i, "phone"],
  [/transportation|logistics/i, "truck"], [/fleet|vehicle/i, "car"], [/facilities|property/i, "wrench"], [/security/i, "shield"],
  [/environmental|waste/i, "hazard"], [/mentoring|advisory/i, "bulb"], [/education|training/i, "cap"], [/lead/i, "target"],
  [/travel|events/i, "plane"], [/healthcare/i, "heart"], [/staffing|contingent/i, "people"], [/personal|domestic/i, "house"],
  [/professional|business/i, "briefcase"],
];

export function motifFor(typeName?: string | null, category?: string | null): keyof typeof M {
  const t = typeName ?? "";
  for (const [re, m] of RULES) if (t && re.test(t)) return m;
  const c = category ?? "";
  for (const [re, m] of CATEGORY) if (c && re.test(c)) return m;
  return "box";
}

/** `size="row"` = fixed 56 px square (list rows); `"band"` = full-width 16:9 band (cards); a number = that square. */
export function TypeArt({ typeName, category, size = "row", className = "" }: { typeName?: string | null; category?: string | null; size?: "row" | "band" | number; className?: string }) {
  const motif = M[motifFor(typeName, category)];
  const box = size === "band" ? "aspect-video w-full" : "shrink-0";
  const style = typeof size === "number" ? { width: size, height: size } : size === "row" ? { width: 56, height: 56 } : undefined;
  return (
    <span aria-hidden data-type-art={motifFor(typeName, category)} className={`grid place-items-center overflow-hidden rounded-[10px] bg-magenta/10 text-ink dark:bg-magenta/15 dark:text-white ${box} ${className}`} style={style}>
      <svg viewBox="0 0 64 64" className={size === "band" ? "h-[62%] w-auto" : "h-[70%] w-[70%]"} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {motif()}
      </svg>
    </span>
  );
}
