import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    /*
      ⚠⚠ `.next*`, NOT JUST `.next` (`P2-J1.1-E012`, 2026-09-05). A stale build
      directory renamed out of the way — `.next_stale_0904/`, 14M from
      2026-09-04 — was still being linted, and `npm run lint` read 1321 problems
      (562 errors, 759 warnings) against a real baseline of 43 (11/32). A gate
      reporting a thirty-fold regression nobody caused is a gate people stop
      reading, which is the same failure `.harness/**` below was added to
      prevent, in the same words.
      ⚠ THIS DELETES NOTHING. The directory is untracked build output and is
      Scott's to remove; this only stops it counting against the baseline.
    */
    ".next*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    /*
      BUILD OUTPUT, NOT SOURCE. `.harness/` holds the esbuild bundles the
      `check:*` and `seed:*` scripts compile to; it is already gitignored.
      eslint was still reading it, so `npm run lint` reported 131 problems
      against 44 real ones — 87 of them inside generated single-line bundles
      nobody can act on. A gate that loud is a gate people stop reading.
    */
    ".harness/**",
    /*
      TEST HARNESS, NOT APP CODE. `e2e/` is Playwright's, and it is linted by
      nothing here on purpose: the 44-problem baseline is a number Scott reads
      to mean "the app got no worse," and a new folder quietly adding to it is
      how a lint gate stops meaning anything. Playwright's own run is the gate
      on this folder.
    */
    "e2e/**",
    /* Same reasoning, same rule — `check:app-shell`'s suite. */
    "e2e-shell/**",
    /* Playwright's output, and gitignored — never source. */
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
