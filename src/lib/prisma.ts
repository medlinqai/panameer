import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { freshness } from "./prisma-freshness";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // RM-E005: keep idle connections 5 min (pg's 10 s default made the first page after a pause reconnect, +0.5–0.8 s).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, idleTimeoutMillis: 5 * 60_000 });
  return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  warnIfStale();
}

function warnIfStale() {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { statSync } = require("fs") as typeof import("fs");
    const { join } = require("path") as typeof import("path");
    /* eslint-enable @typescript-eslint/no-require-imports */
    const mtime = (...parts: string[]) => {
      try {
        return statSync(join(process.cwd(), ...parts)).mtimeMs;
      } catch {
        return null;
      }
    };
    const { problem, message } = freshness({
      schemaMs: mtime("prisma", "schema.prisma"),
      clientMs: mtime("node_modules", ".prisma", "client", "schema.prisma"),
      processStartMs: Date.now() - process.uptime() * 1000,
    });
    if (problem) {
      console.error(`\n⚠ PRISMA CLIENT [${problem}] — ${message}\n`);
    }
  } catch {
    /** A CHECK THAT CANNOT RUN MUST BE SILENT. It is a convenience, and an */
  }
}
