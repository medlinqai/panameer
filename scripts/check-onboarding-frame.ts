import { readFileSync } from "node:fs";
import { PROVIDER_STEPS, RECRUITER_STEPS } from "@/lib/onboarding";
import { REQUESTER_WORK_STEPS } from "@/lib/requester-steps";
import { isOnboardingPath } from "@/lib/onboarding-routes";

// E871: every onboarding / registration page renders in the onboarding frame (brief 2026-10-05).
let pass = 0;
const fails: string[] = [];
const check = (name: string, ok: boolean, why = "") => (ok ? pass++ : fails.push(`${name}${why ? ` — ${why}` : ""}`));
const read = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

// 1. Every route in scope uses the frame (or only redirects).
const ROUTES: Record<string, string> = {
  "/join": "src/app/join/page.tsx",
  "/join/provider/start": "src/app/join/provider/start/page.tsx",
  "/join/provider": "src/app/join/provider/page.tsx",
  "/join/provider/preview": "src/app/join/provider/preview/page.tsx",
  "/join/requester": "src/app/join/requester/page.tsx",
  "/join/requester/start": "src/app/join/requester/start/page.tsx",
  "/join/requester/steps": "src/app/join/requester/steps/page.tsx",
  "/join/requester/ready": "src/app/join/requester/ready/page.tsx",
  "/join/buyer": "src/app/join/buyer/page.tsx",
  "/join/coming-soon": "src/app/join/coming-soon/page.tsx",
  "/verify-email": "src/app/verify-email/page.tsx",
  "/invite/accept": "src/app/invite/accept/page.tsx",
  "/invite/colleague/x": "src/app/invite/colleague/[token]/page.tsx",
};
const FRAME = /<(OnboardingShell|WizardShell|StartPage|PlainShell)\b/;
for (const [route, file] of Object.entries(ROUTES)) {
  const s = code(file);
  const redirectOnly = !/return\s*\(\s*</.test(s) && /redirect\(/.test(s);
  check(`1 — ${route} renders in the frame`, redirectOnly || FRAME.test(s), file);
  check(`1 — ${route} is an onboarding path (slim bar, no promo banner)`, isOnboardingPath(route));
  check(`1 — ${route} imports no marketing header/footer`, !/MarketingHeader|MarketingFooter/.test(s));
}

// 2. Square: no rounded inputs, boxes, cards or chips on these pages and the frame's parts.
const SQUARE = [
  ...Object.values(ROUTES),
  "src/components/onboarding/WizardShell.tsx",
  "src/components/onboarding/StepRail.tsx",
  "src/components/onboarding/OnboardingBar.tsx",
  "src/components/onboarding/AiLine.tsx",
  "src/components/onboarding/controls.tsx",
  "src/components/onboarding/StartPage.tsx",
  "src/components/onboarding/ResumeDropzone.tsx",
  "src/components/onboarding/editors/SkillsEditor.tsx",
  "src/components/onboarding/editors/RateEditor.tsx",
  "src/components/home/PublishedDialog.tsx",
];
for (const f of SQUARE) {
  const hits = code(f).match(/(?<![\w-])rounded(?:-(?:brand|sm|md|lg|xl|2xl|3xl|\[[^\]]+\]))?(?![\w-])/g) ?? [];
  check(`2 — ${f} has no rounded boxes`, hits.length === 0, hits.slice(0, 3).join(", "));
}

// 3. Every step opens at the top.
const shell = code("src/components/onboarding/WizardShell.tsx");
check("3 — WizardShell scrolls to the top when the step changes", /window\.scrollTo\(\{?\s*top:\s*0/.test(shell) || /window\.scrollTo\(0,\s*0\)/.test(shell));
check("3 — the scroll is keyed on the step", /rail\.current/.test(shell));

// 4. Step count = the member's itinerary (Résumé + steps, Review unnumbered).
const count = (steps: readonly string[]) => 1 + steps.filter((s) => s !== "finish").length;
check("4 — provider itinerary is 6 steps", count(PROVIDER_STEPS) === 6, String(count(PROVIDER_STEPS)));
check("4 — recruiter itinerary is 5 steps", count(RECRUITER_STEPS) === 5, String(count(RECRUITER_STEPS)));
check("4 — requester itinerary is 2 steps", REQUESTER_WORK_STEPS.length === 2);
const wiz = code("src/app/join/provider/page.tsx");
check("4 — wizard rail is built from the itinerary", /railKeys = \["tell_us", \.\.\.steps\.filter/.test(wiz));
check("4 — wizard eyebrow counts railKeys", /Step \$\{railIndex \+ 1\} of \$\{railKeys\.length\}/.test(wiz));
check("4 — no hard-coded 'of 7'", !/of 7\b/.test(wiz));
const start = code("src/app/join/provider/start/page.tsx");
check("4 — start page cards = Résumé + itinerary", /\["tell_us", \.\.\.stepsForProfile/.test(start));
const req = code("src/app/join/requester/steps/page.tsx");
check("4 — requester rail + eyebrow from REQUESTER_WORK_STEPS", /REQUESTER_WORK_STEPS\.map/.test(req) && /of \$\{railSteps\.length\}/.test(req));

// 5. Frame parts.
check("5 — rail marks done / now / next", /data-rail-state/.test(read("src/components/onboarding/StepRail.tsx")));
check("5 — eyebrow, AI line and phone-first Next exist", /data-step-eyebrow/.test(shell) && /data-ai-line/.test(shell) && /order-first flex w-full/.test(shell));
check("5 — Back uses the ink focus ring", /focus-visible:outline-ink/.test(shell));
check("5 — promo banner hides on onboarding paths", /isOnboardingPath/.test(read("src/components/DevBanner.tsx")));
check("5 — provider review says Publish profile", /"Publish profile"/.test(wiz));

console.log(`check:onboarding-frame — ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  ✗ ${f}`);
console.log("  (fits-one-screen at 1440×800 / 390×750, light + dark: e2e-r1/onboarding-frame.spec.ts)");
process.exit(fails.length ? 1 : 0);
