import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local so the Prisma CLI (migrate/seed) sees the same vars as the app.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

export default defineConfig({
  datasource: {
    // Migrations use the DIRECT (non-pooled) connection.
    url: process.env.DIRECT_URL as string,
  },
  migrations: {
    seed: "ts-node --project tsconfig.seed.json prisma/seed.ts",
  },
});
