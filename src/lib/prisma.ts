import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { freshness } from "./prisma-freshness";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
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
    /** ⚠⚠ A CHECK THAT CANNOT RUN MUST BE SILENT. It is a convenience, and an
     *  error from it would be indistinguishable from the error it describes. */
  }
}
