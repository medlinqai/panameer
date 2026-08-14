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
  ]),
]);

export default eslintConfig;
