import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { join } from "node:path";
import { withPoolRetry } from "./_pool-retry";

/**
 * ── ⚠⚠ THE WALK ASSERTS THE DATABASE, NOT THE PAGE (`P2-A2-E597` WS-A) ────
 *
 * ⚠ SCOTT'S BRIEF: the registration walk *"asserts what each step SAVES: the
 * database row after each step, not just that the page advanced."*
 * ⚠⚠ THAT DISTINCTION IS THE WHOLE POINT OF THIS FILE. A wizard that advances
 * while saving nothing looks identical to one that works, and `E597` is about
 * to move every one of those save paths — so the net has to be under them, not
 * over them.
 *
 * ⚠ `.env.local` IS LOADED EXPLICITLY. Playwright does not load it, and without
 * `DATABASE_URL` the client silently targets localhost and every assertion
 * fails for a reason that has nothing to do with the wizard.
 */
config({ path: join(process.cwd(), ".env.local") });

/**
 * ── ⚠⚠⚠ THE POOLER RETRY IS APPLIED HERE, ONCE (`P2-A2-E597` WS-D) ────────
 *
 * ⚠ Measured at WS-C's gate: `check:wizard-contract` failed ~4 of 12
 * back-to-back runs, **never on a save assertion** — always `08006 /
 * EAUTHTIMEOUT` against the SHARED Supabase pooler that localhost, every
 * preview and production all point at.
 *
 * ⚠⚠ IT WRAPS THE CLIENT RATHER THAN EACH CALL SITE because there are 20 of
 * them in one spec alone, and a retry that has to be REMEMBERED at each call is
 * a retry that will be missing from the next one somebody writes.
 * ⚠⚠⚠ ONLY A CONNECTION FAULT IS RETRIED — `_pool-retry.ts` rethrows every
 * assertion failure on the first attempt, and its `matcherResult` guard is what
 * makes that structural rather than a matter of wording.
 *
 * ⚠ `$transaction`, `$connect`, `$disconnect` and everything else beginning `$`
 * PASS STRAIGHT THROUGH. Retrying a transaction is a different decision with a
 * different blast radius, and this brief did not make it.
 */
function withRetry(c: PrismaClient): PrismaClient {
  const models = new Map<string, unknown>();
  return new Proxy(c, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof prop !== "string" || prop.startsWith("$") || prop.startsWith("_")) return value;
      if (!value || typeof value !== "object") return value;
      if (models.has(prop)) return models.get(prop);
      /* ⚠ One nested Proxy per model, cached — a fresh Proxy on every property
         read would break identity comparisons and allocate per query. */
      const model = new Proxy(value as Record<string, unknown>, {
        get(mTarget, op, mReceiver) {
          const fn = Reflect.get(mTarget, op, mReceiver);
          if (typeof fn !== "function" || typeof op !== "string") return fn;
          return (...args: unknown[]) =>
            withPoolRetry(`${prop}.${op}`, () =>
              (fn as (...a: unknown[]) => Promise<unknown>).apply(mTarget, args)
            );
        },
      });
      models.set(prop, model);
      return model;
    },
  }) as PrismaClient;
}

let client: PrismaClient | null = null;
export function db(): PrismaClient {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is unset — .env.local did not load");
    client = withRetry(new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) }));
  }
  return client;
}
