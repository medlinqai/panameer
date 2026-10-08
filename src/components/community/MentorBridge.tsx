// Mentors hero picture: your mentors → you → your mentees. Solid = accepted, dashed = open spot, you in magenta.
type P = { name: string; photoUrl: string | null };
const INK = "#272334";
const OFF = "#C9CDDC";
const MAG = "#d72cd6";
const ini = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const YS = [60, 140, 220];

function Node({ x, y, p, id }: { x: number; y: number; p: P | null; id: string }) {
  if (!p) return <circle cx={x} cy={y} r={22} fill="none" stroke={OFF} strokeWidth={2} strokeDasharray="5 5" />;
  return (
    <g>
      <title>{p.name}</title>
      <circle cx={x} cy={y} r={22} fill="#f6f5f9" />
      {p.photoUrl ? (
        <>
          <clipPath id={id}><circle cx={x} cy={y} r={22} /></clipPath>
          <image href={p.photoUrl} x={x - 22} y={y - 22} width={44} height={44} clipPath={`url(#${id})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#4a4658">{ini(p.name)}</text>
      )}
      <circle cx={x} cy={y} r={22} fill="none" stroke={INK} strokeWidth={2} />
    </g>
  );
}

export function MentorBridge({ mentors, mentees, me }: { mentors: P[]; mentees: P[]; me: P }) {
  const left = [0, 1, 2].map((i) => mentors[i] ?? null);
  const right = [0, 1, 2].map((i) => mentees[i] ?? null);
  return (
    <div data-mentor-bridge>
      <svg viewBox="0 0 340 280" width="100%" className="mx-auto block max-w-[320px]" role="img" aria-label={`${mentors.length} mentors, ${mentees.length} mentees`}>
        <text x={52} y={20} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing={1.2} fill="#4a4658">YOUR MENTORS</text>
        <text x={288} y={20} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing={1.2} fill="#4a4658">YOUR MENTEES</text>
        {left.map((p, i) => <line key={`l${i}`} x1={74} y1={YS[i]} x2={138} y2={140} stroke={p ? INK : OFF} strokeWidth={2} strokeDasharray={p ? undefined : "5 5"} />)}
        {right.map((p, i) => <line key={`r${i}`} x1={202} y1={140} x2={266} y2={YS[i]} stroke={p ? INK : OFF} strokeWidth={2} strokeDasharray={p ? undefined : "5 5"} />)}
        {left.map((p, i) => <Node key={`ml${i}`} x={52} y={YS[i]} p={p} id={`mb-l${i}`} />)}
        {right.map((p, i) => <Node key={`mr${i}`} x={288} y={YS[i]} p={p} id={`mb-r${i}`} />)}
        <circle cx={170} cy={140} r={32} fill="#f6f5f9" />
        {me.photoUrl ? (
          <>
            <clipPath id="mb-me"><circle cx={170} cy={140} r={32} /></clipPath>
            <image href={me.photoUrl} x={138} y={108} width={64} height={64} clipPath="url(#mb-me)" preserveAspectRatio="xMidYMid slice" />
          </>
        ) : (
          <text x={170} y={146} textAnchor="middle" fontSize={16} fontWeight={700} fill={INK}>{ini(me.name)}</text>
        )}
        <circle cx={170} cy={140} r={32} fill="none" stroke={MAG} strokeWidth={4} />
        <text x={170} y={194} textAnchor="middle" fontSize={11} fontWeight={700} letterSpacing={1.5} fill={MAG}>YOU</text>
        {mentors.length > 3 && <text x={52} y={262} textAnchor="middle" fontSize={11} fill="#4a4658">+{mentors.length - 3} more</text>}
        {mentees.length > 3 && <text x={288} y={262} textAnchor="middle" fontSize={11} fill="#4a4658">+{mentees.length - 3} more</text>}
      </svg>
      <p className="mt-2 text-center text-[11px] text-ink-2">Solid = connected · dashed = open spot</p>
    </div>
  );
}
