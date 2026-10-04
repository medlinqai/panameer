
export const ROUTE_MAX_DURATION_S = 180;
export const ROUTE_BUDGET_MS = ROUTE_MAX_DURATION_S * 1000;

export const ROUTE_TAIL_RESERVE_MS = 24_000;

export const RESPONSE_RESERVE_MS = 2_000;

export const READ_BUDGET_MS =
  ROUTE_BUDGET_MS - ROUTE_TAIL_RESERVE_MS - RESPONSE_RESERVE_MS;
export const MODEL_TIMEOUT_MS = Math.floor(READ_BUDGET_MS / 2);

export const MIN_CALL_MS = 4_000;

/** How much of the route is left for reading, from a recorded start time. */
export function readTimeRemaining(startedAt: number, now = Date.now()): number {
  return startedAt + READ_BUDGET_MS - now;
}

export function callTimeoutMs(startedAt: number | null, now = Date.now()): number {
  if (startedAt === null) return MODEL_TIMEOUT_MS;
  return Math.min(MODEL_TIMEOUT_MS, Math.max(0, readTimeRemaining(startedAt, now)));
}
