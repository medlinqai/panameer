/**
 * ── ⚠⚠⚠ WHERE THE NODES GO, AND WHY THEY CANNOT LAND ON EACH OTHER ────────
 *
 * `P2-J3-E591` WS-B item 6. ⚠⚠ SCOTT: *"the mockup's first attempt used a
 * radial fan and TWO NODES LANDED ON TOP OF EACH OTHER in a narrow column."*
 *
 * ── WHY THE MOCKUP COLLIDED ────────────────────────────────────────────────
 *
 * ⚠ Its nodes carry HAND-PICKED angles and radii, and its re-settle jitters
 * each one INDEPENDENTLY:
 * //   joined.forEach(j => { j.a = jit(j.a, .34); j.r = jit(j.r, 20); });
 * ⚠⚠ TWO NODES WITH INDEPENDENT RANDOM ANGLES WILL EVENTUALLY SHARE ONE. It is
 * not a tuning problem — no jitter amplitude makes it safe, it only makes it
 * rarer, which is worse because it then ships and happens to somebody else.
 *
 * ── ⚠⚠ WHAT THIS DOES INSTEAD: SPACING IS A PROPERTY, NOT AN OUTCOME ──────
 *
 * ⚠ Nodes on a ring are spaced EVENLY — `2π / n` — so the gap is decided by the
 * COUNT, which is known. ⚠⚠ THE WHOLE RING THEN ROTATES TOGETHER between
 * cycles: movement, with the spacing carried through it unchanged. A rotation
 * cannot close a gap, because every node moves by the same angle.
 * ⚠ Radius breathes by a bounded ±6%, which pushes nodes APART radially and is
 * kept small enough that the two rings can never meet (asserted below).
 *
 * ⚠⚠ AND IT IS SCALE-FREE, WHICH IS THE ANSWER TO *"MEASURE THE WIDTH"*: the
 * `<svg>` carries a `viewBox` and scales to its container, so a collision is a
 * collision in viewBox units at EVERY rendered width, and clearance in viewBox
 * units is clearance at every width. ⚠ The width still decides how SMALL a node
 * gets, which is why the caps in `community-web.ts` exist and why the narrow
 * cases are screenshotted.
 */

/** ⚠ The drawing's own coordinate space. Everything below is in these units. */
export const VIEW = { w: 560, h: 400, cx: 280, cy: 200 } as const;

/** ⚠ Node radii. `me` is the centre; the rest are the three states. */
export const NODE_R = { me: 34, joined: 16, invited: 12, reachable: 8 } as const;

/**
 * ⚠ Two rings, as ellipses — the viewBox is wider than it is tall, and a CIRCLE
 * inside it would waste the horizontal room and crowd the vertical.
 * ⚠⚠ THE CLEARANCE BETWEEN THEM IS ASSERTED, NOT ASSUMED — see `RING_GAP_OK`.
 */
const INNER = { rx: 152, ry: 116 };
const OUTER = { rx: 244, ry: 178 };

/** ⚠ How far a radius may breathe between cycles, as a fraction. */
const BREATHE = 0.06;

export type PlacedNode = {
  key: string;
  kind: "joined" | "invited" | "reachable";
  x: number;
  y: number;
  r: number;
  /** ⚠ Where its line starts. The centre for ring 1, its `via` for ring 2. */
  fromX: number;
  fromY: number;
};

/**
 * ⚠⚠ A DETERMINISTIC HASH, NOT `Math.random()`. The same cycle must produce the
 * same drawing on the server and on the client, or the first paint after
 * hydration jumps. ⚠ It also makes the layout TESTABLE: a gate can sweep
 * thousands of cycles and get the same answers every run.
 */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * ── ⚠⚠⚠ DETERMINISTIC MUST MEAN *BYTE-IDENTICAL OUTPUT*, NOT *SAME ALGORITHM*
 *
 * ⚠⚠ MEASURED 2026-09-20, AS A REAL HYDRATION MISMATCH ON `/community`:
 * *"A tree hydrated but some attributes of the server rendered HTML didn't
 * match the client properties"*, pointing straight at this layout's `<svg>`.
 *
 * ⚠ THE ALGORITHM WAS ALREADY DETERMINISTIC — same inputs, same steps, no
 * `Math.random()`, no `Date.now()`. ⚠⚠ THAT WAS NOT ENOUGH. `Math.sin` is
 * IMPLEMENTATION-DEFINED IN ITS LAST BITS, and the server renders in Node's
 * engine while hydration happens in the browser's. A difference of one ULP
 * becomes `cx="280.00000000000006"` against `cx="280.0000000000001"` — two
 * strings, one mismatch, and React refuses to patch attributes.
 *
 * ⚠⚠ ROUNDING TO TWO DECIMALS IS THE FIX, AND IT IS FREE: the viewBox is 560
 * units wide, so a hundredth of a unit is far below one device pixel at any
 * width this renders at. ⚠ It also shortens every coordinate in the markup.
 *
 * ⚠ `+ 0` NORMALISES `-0` TO `0`, because `Math.round(-0.001)` is `-0` and
 * `String(-0)` is `"0"` on one side and can be `"-0"` on the other.
 */
const q = (n: number): number => Math.round(n * 100) / 100 + 0;

type Input = {
  joined: { id: string }[];
  invited: { id: string }[];
  reachable: { id: string; viaId: string }[];
  /** ⚠ Increments once per SUCCESSFUL refresh. Never on a timer, never on a
   *  failed fetch — see `CommunityWeb.tsx`. */
  cycle: number;
};

export function layoutWeb({ joined, invited, reachable, cycle }: Input): PlacedNode[] {
  /*
    ⚠⚠ ONE RING FOR `joined` + `invited`. They are both first-degree facts — one
    answered, one not — so they belong on the same circle, and sharing it is
    what makes the cap arithmetic in `community-web.ts` correct.
  */
  const inner = [
    ...joined.map((j) => ({ id: j.id, kind: "joined" as const })),
    ...invited.map((i) => ({ id: i.id, kind: "invited" as const })),
  ];

  /* ⚠ The whole ring turns together. `0.37` rad per cycle is visible movement
     that is not a full rotation, so it never looks like a spinner. */
  const innerStart = -Math.PI / 2 + cycle * 0.37;
  const innerStep = inner.length ? (Math.PI * 2) / inner.length : 0;

  const at = (
    ring: { rx: number; ry: number },
    angle: number,
    seed: number
  ): { x: number; y: number } => {
    const k = 1 + (noise(seed) - 0.5) * 2 * BREATHE;
    /* ⚠⚠ QUANTISED HERE, AT THE ONE PLACE COORDINATES ARE BORN — so every
       consumer (the nodes, the line endpoints, the gate) sees the same
       numbers and no caller can reintroduce the mismatch. */
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

  /*
    ⚠⚠ THE OUTER RING IS SORTED BY ITS `via`'s ANGLE, AND THAT IS THE ONLY
    CONCESSION TO PRETTINESS HERE. Placing each reachable node NEXT TO the
    colleague it hangs off would reintroduce collisions the moment two
    colleagues sit close together — which is exactly the mockup's failure.
    ⚠ Sorting keeps the lines in the same rotational ORDER as their sources, so
    they mostly do not cross, while the spacing stays perfectly even.
  */
  const ordered = reachable
    .map((r) => ({ ...r, viaAngle: byId.get(r.viaId)?.angle ?? 0 }))
    .sort((a, b) => a.viaAngle - b.viaAngle);

  /* ⚠ Half a step out of phase with the inner ring, so a node is never directly
     outside another along the same spoke. */
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

/**
 * ⚠⚠ THE RINGS CANNOT MEET, AND HERE IS THE ARITHMETIC RATHER THAN A PROMISE.
 * Worst case is an inner node breathing all the way OUT while an outer node
 * breathes all the way IN, on the axis where the gap is smallest.
 * ⚠ Exported so `check:community-web` asserts it instead of trusting this
 * comment — a comment that does arithmetic is a comment that goes stale.
 */
export const RING_GAP_OK = (() => {
  const innerMaxX = INNER.rx * (1 + BREATHE) + NODE_R.joined;
  const outerMinX = OUTER.rx * (1 - BREATHE) - NODE_R.reachable;
  const innerMaxY = INNER.ry * (1 + BREATHE) + NODE_R.joined;
  const outerMinY = OUTER.ry * (1 - BREATHE) - NODE_R.reachable;
  return {
    x: outerMinX - innerMaxX,
    y: outerMinY - innerMaxY,
    /** ⚠ The outer ring must also stay inside the viewBox. */
    fitsX: VIEW.cx - (OUTER.rx * (1 + BREATHE) + NODE_R.reachable),
    fitsY: VIEW.cy - (OUTER.ry * (1 + BREATHE) + NODE_R.reachable),
    /** ⚠ And the centre portrait must not touch ring one. */
    centre: INNER.ry * (1 - BREATHE) - NODE_R.joined - NODE_R.me,
  };
})();

/** ⚠ Smallest distance between any two node EDGES. Negative means they overlap. */
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
