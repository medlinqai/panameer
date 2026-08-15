"use client";

import { useState } from "react";
import {
  SPEND_BY_BUYER, SPEND_BY_CATEGORY, SPEND_BY_SUPPLIER, SPEND_KPIS,
  SPEND_OFF, SPEND_ON, SPEND_RAIL, SUPPLIER_COUNT, type SpendRow,
} from "@/lib/marketing-scenes";
import { useDecorativeScene } from "@/components/marketing-home/scenes/decorative";

/**
 * SCENE 1 — the Spend Overview dashboard.
 *
 * ⚠ LIVE MARKUP, NOT AN IMAGE. The tooltips and the Table view have to keep
 * working inside the lightbox, which a screenshot cannot do — and the card crop
 * is this same markup at true scale behind a clip, so a bitmap would have to be
 * rendered twice at two sizes anyway.
 *
 * TOOLTIPS ARE POSITIONED IN LOCAL COORDINATES, not `position:fixed` like the
 * mockup. Inside a scrolling lightbox a fixed tooltip detaches from its bar the
 * moment the box scrolls.
 */
type Tip = { x: number; y: number; label: string; rows: [string, string, string][] } | null;

export function SpendOverviewScene() {
  const [tip, setTip] = useState<Tip>(null);
  const [tables, setTables] = useState(false);
  /*
    ⚠ THE CARD CROP IS DECORATIVE — see `./decorative`. This is the only control
    in any of the four scenes, and inside the card it must not be a <button>:
    HTML forbids a button descending from a button, React refuses to hydrate it,
    and the nested control would swallow the Enter/Space that opens the card.
  */
  const decorative = useDecorativeScene();

  return (
    <div className="scene sv" onMouseLeave={() => setTip(null)}>
      <aside className="sv-rail">
        <div className="sv-wordmark"><span className="p">P</span>Panameer</div>
        <div className="sv-grp">
          <div className="sv-cap">BUYER</div>
          {SPEND_RAIL.buyer.map((l) => <div className="sv-rl" key={l}>{l}</div>)}
          <div className="sv-cap sv-cap2">ANALYTICS</div>
          {SPEND_RAIL.analytics.map((l) => (
            <div className={"sv-rl" + (l === SPEND_RAIL.active ? " on" : "")} key={l}>{l}</div>
          ))}
        </div>
      </aside>

      <main className="sv-main">
        <div className="sv-top">
          <h1>Spend Overview</h1>
          <span className="sv-chip">2026/01 – 2026/08</span>
          <span className="sv-chip">USD</span>
          <span className="sv-spacer" />
          {/* Same class and same box either way, so the crop shows exactly what
              opening the card reveals — only one of them is a control. */}
          {decorative ? (
            <span className="sv-viewbtn">Table view</span>
          ) : (
            <button type="button" className="sv-viewbtn" aria-expanded={tables}
              onClick={() => setTables((v) => !v)}>
              {tables ? "Hide table" : "Table view"}
            </button>
          )}
        </div>

        <div className="sv-kpis">
          {SPEND_KPIS.map((k) => (
            <div className="sv-kpi" key={k.k}>
              <div className="k">{k.k}</div>
              <div className="v">{k.v} <span className={"d " + k.dir}>{k.d}</span></div>
            </div>
          ))}
        </div>

        <div className="sv-legend">
          <span><i style={{ background: SPEND_ON }} />On contract</span>
          <span><i style={{ background: SPEND_OFF }} />Off contract</span>
        </div>

        <div className="sv-grid">
          <Panel title="Spend by category" sub="$M, on-contract vs off-contract">
            <Columns data={SPEND_BY_CATEGORY} onTip={setTip} />
          </Panel>
          <Panel title="Spend by buyer" sub="$M, by buying team">
            <Bars data={SPEND_BY_BUYER} onTip={setTip} />
          </Panel>
          <Panel title="Spend by supplier" sub="$M, top five by value">
            <Columns data={SPEND_BY_SUPPLIER} onTip={setTip} />
          </Panel>
          <Panel title="Supplier count" sub="Active and newly onboarded, by quarter — separate scales">
            <SupplierCountPair onTip={setTip} />
          </Panel>
        </div>

        {tables && (
          <div className="sv-tables" aria-live="polite">
            {/* IDENTITY NEVER BY COLOUR ALONE — the table is the same numbers,
                readable without seeing a single swatch. */}
            <Table title="Spend by category ($M)" cols={["Category", "On contract", "Off contract"]} rows={SPEND_BY_CATEGORY} />
            <Table title="Spend by buyer ($M)" cols={["Buying team", "On contract", "Off contract"]} rows={SPEND_BY_BUYER} />
            <Table title="Spend by supplier ($M)" cols={["Supplier", "On contract", "Off contract"]} rows={SPEND_BY_SUPPLIER} />
            <Table title="Supplier count" cols={["Quarter", "Active", "New"]} rows={SUPPLIER_COUNT as unknown as SpendRow[]} />
          </div>
        )}
      </main>

      {tip && (
        <div className="sv-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <b>{tip.label}</b>
          {tip.rows.map((r) => (
            <span key={r[0]}><i style={{ background: r[2] }} />{r[0]} <b>{r[1]}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="sv-panel">
      <h2>{title}</h2>
      <div className="sub">{sub}</div>
      {children}
    </section>
  );
}

function Table({ title, cols, rows }: { title: string; cols: string[]; rows: readonly SpendRow[] }) {
  return (
    <>
      <h3>{title}</h3>
      <table>
        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}><td>{r[0]}</td><td className="n">{r[1]}</td><td className="n">{r[2]}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** A "nice" tick that keeps headroom honest — the mockup's `nice(raw/3)*3`. */
function niceMax(data: readonly SpendRow[]) {
  const raw = Math.max(...data.map((d) => d[1] + d[2])) * 1.12;
  const v = raw / 3;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p * 3;
}

type TipSetter = (t: Tip) => void;
const money = (n: number) => `$${n.toFixed(1)}M`;

function tipRows(on: number, off: number): [string, string, string][] {
  return [
    ["On contract", money(on), SPEND_ON],
    ["Off contract", money(off), SPEND_OFF],
    ["Total", money(on + off), "#ffffff55"],
  ];
}

function Columns({ data, onTip }: { data: readonly SpendRow[]; onTip: TipSetter }) {
  const W = 420, H = 210, L = 34, R = 6, T = 10, B = 42;
  const pw = W - L - R, ph = H - T - B, max = niceMax(data);
  const step = pw / data.length, bw = Math.min(38, step * 0.5);
  return (
    <svg className="sv-chart" viewBox="0 0 420 210" role="img"
      aria-label={`${data.length} columns, on contract versus off contract`}>
      {[0, 1, 2, 3].map((i) => {
        const y = T + ph - (ph * i) / 3;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y} y2={y} className="gl" />
            <text x={L - 7} y={y + 3} textAnchor="end" className="ax">
              {((max * i) / 3) % 1 === 0 ? String((max * i) / 3) : ((max * i) / 3).toFixed(1)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = L + step * i + step / 2;
        const hOn = (ph * d[1]) / max, hOff = (ph * d[2]) / max;
        const yOn = T + ph - hOn, yOff = yOn - hOff;
        const words = d[0].split(" ");
        const two = words.length > 2 ? [words.slice(0, 2).join(" "), words.slice(2).join(" ")] : words;
        return (
          <g key={d[0]} className="seg"
            onMouseMove={(e) => {
              const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
              onTip({ x: e.clientX - r.left + 14, y: e.clientY - r.top - 8, label: d[0], rows: tipRows(d[1], d[2]) });
            }}>
            <rect x={cx - bw / 2} y={yOn} width={bw} height={Math.max(hOn, 2)} fill={SPEND_ON} />
            <rect x={cx - bw / 2} y={yOff} width={bw} height={Math.max(hOff - 2, 2)} rx="4" fill={SPEND_OFF} />
            <text x={cx} y={yOff - 6} textAnchor="middle" className="vl">{(d[1] + d[2]).toFixed(1)}</text>
            {two.map((w, k) => (
              <text key={w} x={cx} y={T + ph + 15 + k * 11} textAnchor="middle" className="ax">{w}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Bars({ data, onTip }: { data: readonly SpendRow[]; onTip: TipSetter }) {
  const W = 420, H = 210, L = 112, R = 40, T = 8, B = 8;
  const pw = W - L - R, ph = H - T - B;
  const max = Math.max(...data.map((d) => d[1] + d[2])) * 1.12;
  const step = ph / data.length, bh = Math.min(26, step * 0.56);
  return (
    <svg className="sv-chart" viewBox="0 0 420 210" role="img" aria-label="Spend by buying team">
      {data.map((d, i) => {
        const cy = T + step * i + step / 2;
        const wOn = (pw * d[1]) / max, wOff = (pw * d[2]) / max;
        return (
          <g key={d[0]} className="seg"
            onMouseMove={(e) => {
              const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
              onTip({ x: e.clientX - r.left + 14, y: e.clientY - r.top - 8, label: d[0], rows: tipRows(d[1], d[2]) });
            }}>
            <rect x={L} y={cy - bh / 2} width={Math.max(wOn, 2)} height={bh} fill={SPEND_ON} />
            <rect x={L + wOn + 2} y={cy - bh / 2} width={Math.max(wOff - 2, 2)} height={bh} rx="4" fill={SPEND_OFF} />
            <text x={L - 9} y={cy + 3.5} textAnchor="end" className="ax">{d[0]}</text>
            <text x={L + wOn + wOff + 8} y={cy + 3.5} className="vl">{(d[1] + d[2]).toFixed(1)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * ⚠ TWO CHARTS, TWO SCALES — never one plot with two y-axes.
 *
 * Active suppliers run ~1,200 and new suppliers ~40. On a shared scale the new
 * line is flat on the floor; on a dual axis the chart says whatever you want by
 * choosing where the axes cross. Small multiples is the honest shape, and the
 * sub-head says "separate scales" so the reader is told.
 */
function SupplierCountPair({ onTip }: { onTip: TipSetter }) {
  const W = 420, H = 210, L = 42, R = 46, GAP = 16;
  const rowH = (H - GAP - 24) / 2;
  const rows: [string, number[], string][] = [
    ["Active suppliers", SUPPLIER_COUNT.map((d) => d[1]), SPEND_ON],
    ["New suppliers", SUPPLIER_COUNT.map((d) => d[2]), SPEND_OFF],
  ];
  return (
    <svg className="sv-chart" viewBox="0 0 420 210" role="img"
      aria-label="Active and new supplier counts by quarter, on separate scales">
      {rows.map(([name, vals, color], ri) => {
        const T = ri * (rowH + GAP) + 4, ph = rowH - 16, pw = W - L - R;
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const pad = (hi - lo || 1) * 0.35, min = lo - pad, max = hi + pad;
        const px = (i: number) => L + (pw * i) / (vals.length - 1);
        const py = (v: number) => T + 10 + ph - (ph * (v - min)) / (max - min);
        const pts = vals.map((v, i) => [px(i), py(v)] as const);
        return (
          <g key={name}>
            <text x={L} y={T + 2} className="vl" fill={color}>{name}</text>
            <line x1={L} x2={W - R} y1={T + ph + 10} y2={T + ph + 10} className="gl" />
            <path d={"M" + pts.map((p) => `${p[0]},${p[1]}`).join("L")} fill="none"
              stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i} className="seg"
                onMouseMove={(e) => {
                  const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                  onTip({ x: e.clientX - r.left + 14, y: e.clientY - r.top - 8,
                    label: SUPPLIER_COUNT[i][0], rows: [[name, String(vals[i]), color]] });
                }}>
                <circle cx={p[0]} cy={p[1]} r="4.5" fill="#fff" stroke={color} strokeWidth="2" />
                <circle cx={p[0]} cy={p[1]} r="12" fill="transparent" />
              </g>
            ))}
            <text x={W - R + 7} y={pts[pts.length - 1][1] + 3.5} className="vl" fill={color}>
              {vals[vals.length - 1].toLocaleString()}
            </text>
            {ri === 1 && SUPPLIER_COUNT.map((d, i) => (
              <text key={d[0]} x={px(i)} y={T + ph + 24} textAnchor="middle" className="ax">{d[0]}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
