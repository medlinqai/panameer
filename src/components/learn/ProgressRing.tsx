// Learn hero picture: progress ring — ink = done, #C9CDDC = left, magenta marker at where you are.
export function ProgressRing({ done, total, title, caption }: { done: number; total: number; title?: string | null; caption?: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const R = 104;
  const C = 2 * Math.PI * R;
  const a = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const mx = 170 + R * Math.cos(a);
  const my = 140 + R * Math.sin(a);
  return (
    <div data-progress-ring>
      <svg viewBox="0 0 340 280" width="100%" className="mx-auto block max-w-[300px]" role="img" aria-label={`${pct}% · ${done} of ${total} lessons`}>
        <circle cx={170} cy={140} r={R} fill="none" stroke="#C9CDDC" strokeWidth={18} />
        {pct > 0 && <circle cx={170} cy={140} r={R} fill="none" stroke="#272334" strokeWidth={18} strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 170 140)" />}
        {pct > 0 && <circle cx={mx} cy={my} r={12} fill="#d72cd6" stroke="#fff" strokeWidth={3} />}
        <text x={170} y={140} textAnchor="middle" fontSize={44} fontWeight={800} fill="#272334">{caption ?? `${pct}%`}</text>
        {total > 0 && <text x={170} y={168} textAnchor="middle" fontSize={13} fontWeight={600} fill="#4a4658">{done} of {total} lessons</text>}
      </svg>
      {title && <p className="mt-1 text-center text-[12.5px] font-semibold text-ink-2">{title}</p>}
    </div>
  );
}
