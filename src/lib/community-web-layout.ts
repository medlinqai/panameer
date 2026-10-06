
export const VIEW = { w: 560, h: 400, cx: 280, cy: 200 } as const;

export const NODE_R = { me: 34, joined: 16, invited: 12, reachable: 8 } as const;

const INNER = { rx: 152, ry: 116 };
const OUTER = { rx: 244, ry: 178 };

const BREATHE = 0.06;

export type PlacedNode = {
  key: string;
  kind: "joined" | "invited" | "reachable";
  x: number;
  y: number;
  r: number;
  fromX: number;
  fromY: number;
};

function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const q = (n: number): number => Math.round(n * 100) / 100 + 0;

type Input = {
  joined: { id: string }[];
  invited: { id: string }[];
  reachable: { id: string; viaId: string }[];
  cycle: number;
};

export function layoutWeb({ joined, invited, reachable, cycle }: Input): PlacedNode[] {
  const inner = [
    ...joined.map((j) => ({ id: j.id, kind: "joined" as const })),
    ...invited.map((i) => ({ id: i.id, kind: "invited" as const })),
  ];

  const innerStart = -Math.PI / 2 + cycle * 0.37;
  const innerStep = inner.length ? (Math.PI * 2) / inner.length : 0;

  const at = (
    ring: { rx: number; ry: number },
    angle: number,
    seed: number
  ): { x: number; y: number } => {
    const k = 1 + (noise(seed) - 0.5) * 2 * BREATHE;
    return {
      x: q(VIEW.cx + Math.cos(angle) * ring.rx * k),
      y: q(VIEW.cy + Math.sin(angle) * ring.ry * k),
    };
  };

  const innerPlaced = inner.map((n, i) => {
    const angle = innerStart + i * innerStep;
    const p = at(INNER, angle, cycle * 131 + i);
    return { ...n, angle, ...p };
  });

  const byId = new Map(innerPlaced.map((p) => [p.id, p]));

  const ordered = reachable
    .map((r) => ({ ...r, viaAngle: byId.get(r.viaId)?.angle ?? 0 }))
    .sort((a, b) => a.viaAngle - b.viaAngle);

  const outerStart = -Math.PI / 2 + cycle * 0.23 + innerStep / 2;
  const outerStep = ordered.length ? (Math.PI * 2) / ordered.length : 0;

  const outerPlaced = ordered.map((r, i) => {
    const p = at(OUTER, outerStart + i * outerStep, cycle * 977 + i);
    const via = byId.get(r.viaId);
    return {
      key: r.id,
      kind: "reachable" as const,
      ...p,
      r: NODE_R.reachable,
      fromX: via?.x ?? VIEW.cx,
      fromY: via?.y ?? VIEW.cy,
    };
  });

  return [
    ...outerPlaced,
    ...innerPlaced.map((n) => ({
      key: n.id,
      kind: n.kind,
      x: n.x,
      y: n.y,
      r: n.kind === "joined" ? NODE_R.joined : NODE_R.invited,
      fromX: VIEW.cx,
      fromY: VIEW.cy,
    })),
  ];
}

export const RING_GAP_OK = (() => {
  const innerMaxX = INNER.rx * (1 + BREATHE) + NODE_R.joined;
  const outerMinX = OUTER.rx * (1 - BREATHE) - NODE_R.reachable;
  const innerMaxY = INNER.ry * (1 + BREATHE) + NODE_R.joined;
  const outerMinY = OUTER.ry * (1 - BREATHE) - NODE_R.reachable;
  return {
    x: outerMinX - innerMaxX,
    y: outerMinY - innerMaxY,
    fitsX: VIEW.cx - (OUTER.rx * (1 + BREATHE) + NODE_R.reachable),
    fitsY: VIEW.cy - (OUTER.ry * (1 + BREATHE) + NODE_R.reachable),
    center: INNER.ry * (1 - BREATHE) - NODE_R.joined - NODE_R.me,
  };
})();

export function minClearance(nodes: PlacedNode[]): number {
  let worst = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      if (d < worst) worst = d;
    }
  }
  return nodes.length < 2 ? Infinity : worst;
}
