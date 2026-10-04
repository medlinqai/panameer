
export type Freshness = {
  /** `null` when nothing is wrong — the only shape a caller should act on. */
  problem: "generate" | "restart" | null;
  message: string | null;
};

export type FreshnessInput = {
  /** mtime of `prisma/schema.prisma`, in ms. */
  schemaMs: number | null;
  /** mtime of the generated client's own schema copy, in ms. */
  clientMs: number | null;
  /** when this process started, in ms. */
  processStartMs: number;
};

const SLACK_MS = 1_000;

export function freshness({ schemaMs, clientMs, processStartMs }: FreshnessInput): Freshness {
  if (schemaMs === null || clientMs === null) return { problem: null, message: null };

  if (schemaMs > clientMs + SLACK_MS) {
    return {
      problem: "generate",
      message:
        "prisma/schema.prisma is newer than the generated client. Run `npx prisma generate` " +
        "(then restart this server) or the next query fails with `Unknown field` on a column that exists.",
    };
  }

  if (clientMs > processStartMs + SLACK_MS) {
    return {
      problem: "restart",
      message:
        "The Prisma client was regenerated after this server started, so this process is still " +
        "using the OLD one. RESTART it: stop the server, `rm -rf .next`, then start it again — in that order.",
    };
  }

  return { problem: null, message: null };
}
