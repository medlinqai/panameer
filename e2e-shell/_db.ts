import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { join } from "node:path";

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

let client: PrismaClient | null = null;
export function db(): PrismaClient {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is unset — .env.local did not load");
    client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  return client;
}
