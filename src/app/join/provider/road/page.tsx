import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PROVIDER_ROAD, ROAD_LANES, ROAD_PHASES, type LifecycleStep } from "@/lib/user-levels";

export const metadata = { title: "The Detailed Road · Panameer" };

// RD-E005: the detailed provider road (mockup detailed_road_v5): 1–4 in one row, stop 5 splits into three lanes that merge at
// "Work Order Signed", then 6–8. Each phase has its own color on the road, rings, label and band.
const NUM = "#8A90A8";
const INK = "#272334";
const INK2 = "#5b5870";
const J = ROAD_PHASES.join, W = ROAD_PHASES.win, P = ROAD_PHASES.paid;
const by = (k: string) => PROVIDER_ROAD.find((s) => s.key === k)!;
const MAIN: { s: LifecycleStep; n: string; x: number; y: number }[] = [
  { s: by("register"), n: "1", x: 130, y: 100 },
  { s: by("verify"), n: "2", x: 390, y: 100 },
  { s: by("profile"), n: "3", x: 650, y: 100 },
  { s: by("list"), n: "4", x: 910, y: 100 },
  { s: by("deliver"), n: "6", x: 360, y: 580 },
  { s: by("request"), n: "7", x: 640, y: 580 },
  { s: by("paid"), n: "8", x: 920, y: 580 },
];
const LANE_Y = [240, 330, 420];
const LANE_X = [720, 580, 460];
const LANE_PATHS = [
  "M930 330 C860 330 860 240 790 240 H330 C260 240 260 330 200 330",
  "M930 330 H200",
  "M930 330 C860 330 860 420 790 420 H330 C260 420 260 330 200 330",
];

function Road({ d, color, w = 28 }: { d: string; color: string; w?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#fff" strokeWidth={w > 20 ? 2 : 1.5} strokeDasharray={w > 20 ? "10 12" : "6 8"} />
    </>
  );
}

export default function DetailedRoadPage() {
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-[1140px]" data-detailed-road>
        <Logo />
        <p className="mt-10 text-[11px] font-bold uppercase tracking-[0.14em] text-magenta">Welcome · For Providers</p>
        <h1 className="mt-1.5 text-[36px] font-extrabold leading-[1.1] sm:text-[40px]">The Detailed Road</h1>
        <p className="mt-2 max-w-[780px] text-[15px] leading-relaxed text-ink-2">
          Eight stops, 10–15 minutes to be found. Add your services and products, win work at stop 5 in <b className="text-ink">three ways</b>, deliver it and request payment. Payout details come last, only when money leaves Panameer.
        </p>
        <div className="mt-4 overflow-x-auto">
          <svg viewBox="0 0 1080 700" role="img" aria-label="Provider road, eight stops" className="block h-auto w-full min-w-[700px] font-sans">
            <rect x={20} y={20} width={1040} height={190} rx={18} fill={J.band} />
            <rect x={20} y={214} width={1040} height={250} rx={18} fill={W.band} />
            <rect x={20} y={468} width={1040} height={222} rx={18} fill={P.band} />
            <Road d="M60 100 H930" color={J.track} />
            <Road d="M930 100 C1030 100 1030 330 930 330" color={W.track} />
            <Road d="M200 330 C90 330 90 580 200 580 H1020" color={P.track} />
            {LANE_PATHS.map((d) => <Road key={d} d={d} color={W.track} w={14} />)}
            <text x={44} y={48} fill={J.color} fontWeight={800} fontSize={11} letterSpacing=".14em">JOIN &amp; GET FOUND · 10–15 MIN</text>
            <text x={1040} y={246} textAnchor="end" fill={W.color} fontWeight={800} fontSize={11} letterSpacing=".14em">{W.label.toUpperCase()}</text>
            <text x={1040} y={500} textAnchor="end" fill={P.color} fontWeight={800} fontSize={11} letterSpacing=".14em">GET PAID</text>
            {ROAD_LANES.map((l, i) => (
              <text key={l.id} x={345} y={LANE_Y[i] - 18} fill={W.color} fontWeight={800} fontSize={10.5} letterSpacing=".1em">{l.id} · {l.name.toUpperCase()}</text>
            ))}
            {ROAD_LANES.flatMap((l, i) =>
              l.steps.map((t, j) => (
                <g key={`${l.id}.${j}`} data-lane-step={`${l.id}.${j + 1}`}>
                  <circle cx={LANE_X[j]} cy={LANE_Y[i]} r={7} fill="#fff" stroke="#D98ED8" strokeWidth={2.5} />
                  <text x={LANE_X[j]} y={LANE_Y[i] + 22} textAnchor="middle" fill={INK2} fontWeight={700} fontSize={11.5}>{t}</text>
                  <text x={LANE_X[j]} y={LANE_Y[i] + 35} textAnchor="middle" fill={NUM} fontWeight={700} fontSize={9}>{l.id}.{j + 1}</text>
                </g>
              ))
            )}
            {/* Stop 5 splits; the lanes merge at Work Order Signed. */}
            <g data-stop="5">
              <circle cx={930} cy={330} r={22} fill={W.color} stroke={W.color} strokeWidth={3} />
              <text x={930} y={336} textAnchor="middle" fill="#fff" fontWeight={800} fontSize={16}>5</text>
              <text x={964} y={335} fill={INK} fontWeight={700} fontSize={13}>{by("sell").step}</text>
            </g>
            <g data-stop="signed">
              <circle cx={200} cy={330} r={22} fill="#fff" stroke={W.color} strokeWidth={3} />
              <text x={200} y={336} textAnchor="middle" fill={W.color} fontWeight={800} fontSize={16}>✓</text>
              <text x={166} y={329} textAnchor="end" fill={INK} fontWeight={700} fontSize={13}>Work Order Signed</text>
              <text x={166} y={345} textAnchor="end" fill={NUM} fontWeight={700} fontSize={9.5} letterSpacing=".08em">{by("sell").status.toUpperCase()}</text>
            </g>
            {MAIN.map(({ s, n, x, y }) => {
              const C = ROAD_PHASES[s.phase ?? "join"].color;
              const last = s.key === "paid";
              return (
                <g key={s.key} data-stop={n}>
                  <circle cx={x} cy={y} r={last ? 26 : 22} fill="#fff" stroke={C} strokeWidth={3} />
                  <text x={x} y={y + 6} textAnchor="middle" fill={C} fontWeight={800} fontSize={16}>{n}</text>
                  {s.gate && <text x={x} y={y - 36} textAnchor="middle" fontSize={10} fontWeight={800} fill={INK}>{s.admin ? "GATE · BEFORE PAYMENT" : "GATE"}</text>}
                  <text x={x} y={y + 46} textAnchor="middle" fill={last ? INK : INK2} fontWeight={700} fontSize={13}>{s.step}</text>
                  <text x={x} y={y + 61} textAnchor="middle" fill={NUM} fontWeight={700} fontSize={9.5} letterSpacing=".08em">{s.status.toUpperCase()}</text>
                  {s.time && <text x={x} y={y + 76} textAnchor="middle" fill={INK2} fontWeight={600} fontSize={10.5}>⏱ {s.time}</text>}
                </g>
              );
            })}
            {/* RV-E003: payout details are a gate before Get Paid, if required. */}
            <g data-road-lock transform="translate(770 538)">
              <rect x={2} y={9} width={16} height={12} rx={2} fill="#fff" stroke={P.color} strokeWidth={2} />
              <path d="M6 9V6a4 4 0 0 1 8 0v3" fill="none" stroke={P.color} strokeWidth={2} />
              <text x={10} y={-2} textAnchor="middle" fill={P.color} fontWeight={700} fontSize={10.5}>if required</text>
            </g>
          </svg>
        </div>
        <p className="mt-2 text-[13.5px]">
          <Link href="/help/road" data-questions-link className="font-bold text-magenta-dark underline underline-offset-4">Questions?</Link>{" "}
          <span className="text-ink-2">FAQs for each step, or ask us.</span>
        </p>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2">
          <span><b style={{ color: J.color }}>{J.label}</b> · <b style={{ color: W.color }}>{W.label}</b> · <b style={{ color: P.color }}>{P.label}</b></span>
          <span><b className="text-[10px] text-ink">GATE</b> = needed before the next stop · 🔒 = payout details, if required</span>
        </p>
        <ul className="mt-5 max-w-[800px] list-disc space-y-1 pl-5 text-[14px] leading-relaxed">
          <li><b>5.A · Product Bought:</b> Product Located → Added to Requisition → Order Placed. Listed price; orders are accepted automatically (providers can switch to manual). Want something custom? Request an Estimate (5.C).</li>
          <li><b>5.B · Rate Accepted:</b> Provider Asked → Provider Available → Rate Accepted.</li>
          <li><b>5.C · Estimate Accepted:</b> Estimate Requested → Provider Estimates → Estimate Accepted.</li>
          <li><b>6 · Deliver Services &amp; Products:</b> Work Order Signed → tracker updates → the buyer accepts the deliverable or the timesheet.</li>
          <li><b>🔒 Payout details (if required), before 8 · Get Paid:</b> a payout account in your company&apos;s legal name (everyone), plus Tax ID and tax form where your country&apos;s rule needs them (US: W-9 + Tax ID). Ordering, signing work orders and requesting payment never ask for them — only the payout does.</li>
        </ul>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href="/join/provider" className="inline-flex min-h-[48px] items-center bg-ink px-6 text-[15px] font-bold text-surface hover:bg-ink-hover">Complete My Profile</Link>
          <Link href="/join/provider/path" className="text-[14px] font-bold text-magenta-dark underline underline-offset-4">‹ The Simple Road</Link>
        </div>
      </div>
    </main>
  );
}
