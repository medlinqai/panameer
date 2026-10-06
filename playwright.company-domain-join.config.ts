import { defineConfig, devices } from "@playwright/test";

// check:company-domain-join — domain claim rules, request on verify, notifications + sent emails, approve/decline.
// Its own server on :3102 with MAIL_CAPTURE off (.env.local sets it), so SentEmail rows are real Resend sends —
// only ever to Resend's test sink (delivered+…@resend.dev).
export default defineConfig({
  testDir: "./e2e-r1",
  testMatch: "company-domain-join.spec.ts",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://localhost:3102" },
  outputDir: "./e2e-r1/.artifacts",
  retries: 0, workers: 1, reporter: [["list"]], timeout: 240_000,
  webServer: { command: "MAIL_CAPTURE= npx next dev -p 3102", url: "http://localhost:3102", reuseExistingServer: false, timeout: 240_000, stdout: "ignore", stderr: "pipe" },
});
