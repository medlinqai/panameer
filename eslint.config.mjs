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
    /* Playwright's output, and gitignored — never source. */
    "test-results/**",
    "playwright-report/**",
  ]),
]);

export default eslintConfig;
