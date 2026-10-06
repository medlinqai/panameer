import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "/Users/scottwalls/Documents/AI CO/Panameer II/5. Application/5. Source Code/e2e-run10",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3100" },
  outputDir: "/Users/scottwalls/Documents/AI CO/Panameer II/5. Application/5. Source Code/e2e-run10/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 180_000,
});
