import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = { title: "The Detailed Road · Panameer" };

// The detailed provider road (mockup provider_roadmap_fork 2026-10-07): stop 5 splits into Path A / Path B, then they meet.
const TRACK = "#E8EAF1";
const RING = "#C9CDDC";
const NUM = "#8A90A8";
const INK = "#272334";
const INK2 = "#5b5870";
const DEEP = "#3A4166";
const ROADS = [
  "M60 110 H860",
  "M860 110 C960 110 960 290 860 290 H200 C100 290 100 590 200 590",
  "M860 110 C1030 110 1030 430 860 430 H200 C130 430 130 590 200 590",
  "M200 590 H1030",
];
type Stop = { x: number; y: number; n: string; t: string; s: string; tm: string; gate?: string; small?: boolean; last?: boolean };
const STOPS: Stop[] = [
  { x: 100, y: 110, n: "1", t: "Register", s: "REGISTERED", tm: "1 min" },
  { x: 290, y: 110, n: "2", t: "Verify", s: "VERIFIED", tm: "1 min" },
  { x: 480, y: 110, n: "3", t: "Complete Profile", s: "PROFILED", tm: "about 10 min", gate: "GATE" },
  { x: 670, y: 110, n: "4", t: "Add Company", s: "LINKED", tm: "2 min" },
  { x: 760, y: 290, n: "A1", t: "Post a Service Product", s: "LISTED", tm: "10 min each", small: true },
  { x: 520, y: 290, n: "A2", t: "Get an Offer", s: "OFFERED", tm: "buyer's move", small: true },
  { x: 290, y: 290, n: "A3", t: "Accept the Offer", s: "AGREED", tm: "2 min", small: true },
  { x: 760, y: 430, n: "B1", t: "Get Invited (or Find a Request)", s: "INVITED", tm: "buyer's move", small: true },
  { x: 520, y: 430, n: "B2", t: "Propose Your Rate", s: "PROPOSED", tm: "15 min each", small: true },
  { x: 290, y: 430, n: "B3", t: "Agree on Price", s: "AGREED", tm: "varies", small: true },
  { x: 330, y: 590, n: "6", t: "Validate Company", s: "VALIDATED", tm: "8 min · tax form + bank", gate: "GATE · ADMIN" },
  { x: 560, y: 590, n: "7", t: "Do Work", s: "CONTRACTED", tm: "signed work order", gate: "GATE" },
  { x: 790, y: 590, n: "8", t: "Request Payment", s: "REQUESTED", tm: "5 min each" },
  { x: 1000, y: 590, n: "9", t: "Get Paid", s: "PAID", tm: "automatic", last: true },
];
const LABEL = { fontWeight: 800, fontSize: 11, letterSpacing: ".14em" } as const;

export default function DetailedRoadPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[1140px]" data-detailed-road>
        <Logo />
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.14em] text-magenta">Welcome · for providers</p>
        <h1 className="mt-1.5 text-[36px] font-extrabold leading-[1.1] sm:text-[40px]">The detailed road</h1>
        <p className="mt-2 max-w-[780px] text-[15px] text-ink-2">
          After you add your company, stop 5 <b className="text-ink">splits into two ways to win work</b> — sell a ready-made service product, or propose your rate on a buyer&apos;s work request. Use either or both. They meet again at Validate Company, before the first work order.
        </p>
        <div className="mt-4 overflow-x-auto">
          <svg viewBox="0 0 1080 680" role="img" aria-label="Provider road with two paths" className="block h-auto w-full min-w-[640px] font-sans">
            <g fill="none" stroke={TRACK} strokeWidth={28} strokeLinecap="round" strokeLinejoin="round">{ROADS.map((d) => <path key={d} d={d} />)}</g>
            <g fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="10 12">{ROADS.map((d) => <path key={d} d={d} />)}</g>
            <text x={60} y={48} fill={DEEP} style={LABEL}>1 · JOIN &amp; GET FOUND</text>
            <text x={1060} y={226} fill={DEEP} textAnchor="end" style={LABEL}>5 · SELL PRODUCTS / SERVICES — TWO WAYS</text>
            <text x={1060} y={250} fill={DEEP} textAnchor="end" fontWeight={800} fontSize={11.5} letterSpacing=".1em">PATH A · SELL A SERVICE PRODUCT</text>
            <text x={1060} y={390} fill={DEEP} textAnchor="end" fontWeight={800} fontSize={11.5} letterSpacing=".1em">PATH B · PROPOSE ON WORK REQUESTS</text>
            <text x={200} y={532} fill={DEEP} style={LABEL}>3 · CONTRACT &amp; GET PAID</text>
            <text x={96} y={440} fill={DEEP} textAnchor="middle" transform="rotate(-90 96 440)" style={LABEL}>PATHS MEET</text>
            <g>
              <circle cx={860} cy={110} r={14} fill={DEEP} />
              <text x={860} y={115} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={12}>⑂</text>
              <text x={860} y={70} textAnchor="middle" fontSize={10} fontWeight={800} fill={DEEP}>ROAD SPLITS</text>
            </g>
            {STOPS.map((s) => (
              <g key={s.n} data-stop={s.n}>
                <circle cx={s.x} cy={s.y} r={s.last ? 26 : s.small ? 20 : 22} fill="#fff" stroke={s.last ? DEEP : RING} strokeWidth={3} />
                <text x={s.x} y={s.y + (s.small ? 5 : 6)} textAnchor="middle" fill={s.last ? DEEP : NUM} fontWeight={800} fontSize={s.small ? 13 : 16}>{s.n}</text>
                {s.gate && <text x={s.x} y={s.y - 40} textAnchor="middle" fontSize={10} fontWeight={800} fill={INK}>{s.gate}</text>}
                <text x={s.x} y={s.y + 46} textAnchor="middle" fill={s.last ? INK : INK2} fontWeight={700} fontSize={13}>{s.t}</text>
                <text x={s.x} y={s.y + 61} textAnchor="middle" fill={NUM} fontWeight={700} fontSize={9.5} letterSpacing=".08em">{s.s}</text>
                <text x={s.x} y={s.y + 76} textAnchor="middle" fill={INK2} fontWeight={600} fontSize={10.5}>⏱ {s.tm}</text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2">
          <span>A / B = two ways to win work — either or both</span>
          <span><b className="text-[10px] text-ink">GATE</b> = needed before the next stop</span>
        </p>
        <ul className="mt-5 max-w-[780px] list-disc space-y-1 pl-5 text-[14px] leading-relaxed">
          <li><b>Path A · Sell a service product:</b> A1 Post a Service Product (Listed) → A2 Get an Offer (Offered) → A3 Accept the Offer (Agreed). The price is yours up front.</li>
          <li><b>Path B · Propose on work requests:</b> B1 Get Invited, or find a request (Invited) → B2 Propose Your Rate (Proposed) → B3 Agree on Price (Agreed).</li>
          <li>Validate Company covers the tax form <b>and</b> a payout account in the company&apos;s legal name.</li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/join/provider" className="inline-flex min-h-[48px] items-center bg-ink px-6 text-[15px] font-bold text-surface hover:bg-ink-hover">Start My Profile</Link>
          <Link href="/join/provider/path" className="text-[14px] font-bold text-magenta-dark underline underline-offset-4">‹ The simple road</Link>
        </div>
      </div>
    </main>
  );
}
