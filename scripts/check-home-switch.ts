import nextConfig from "../next.config";

type Redirect = {
  source: string;
  destination: string;
  permanent?: boolean;
  has?: { type: string; value?: string }[];
};

const failures: string[] = [];
let pass = 0;
function check(name: string, cond: boolean, msg: string) {
  if (cond) pass++;
  else failures.push(`${name} — ${msg}`);
}

async function rulesWith(value: string | undefined): Promise<Redirect[]> {
  if (value === undefined) delete process.env.HOME_SHOWS_STATUS;
  else process.env.HOME_SHOWS_STATUS = value;
  const out = await (nextConfig.redirects as () => Promise<Redirect[]>)();
  return out;
}

/** Exactly what `prepare-destination.js:45` does with `has.value`. */
const compiled = (value: string) => new RegExp(`^${value}$`);

async function main() {
  const off = await rulesWith(undefined);
  const on = await rulesWith("1");
  const bogus = await rulesWith("true");

  /** ⚠ Count > 0 (`E586`): a config with no redirects would pass every
   *  "the rule is absent" assertion below for the wrong reason. */
  check("1 — the config has redirects to look at", off.length > 5, `${off.length} rules`);

  const rootOf = (rules: Redirect[]) => rules.filter((r) => r.source === "/");

  check(
    "2 — with the switch unset, `/` is NOT redirected",
    rootOf(off).length === 0,
    `${rootOf(off).length} rules on "/" — the marketing home must still answer`,
  );
  check(
    "3 — with HOME_SHOWS_STATUS=1, `/` redirects exactly once",
    rootOf(on).length === 1,
    `${rootOf(on).length} rules on "/"`,
  );
  check(
    "4 — the switch changes the rule count by exactly one",
    on.length === off.length + 1,
    `off ${off.length}, on ${on.length} — anything else means it touched another rule`,
  );
  /**
   * ⚠⚠ ONLY THE LITERAL `1` TURNS IT ON. `"true"`, `"yes"` and `"0"` must not,
   * because a half-remembered value in a dashboard is how a front door gets
   * redirected by accident — and this one is irreversible from the visitor's
   * side until somebody notices.
   */
  check(
    "5 — only the literal `1` arms it; `true` does not",
    rootOf(bogus).length === 0,
    `"true" armed the redirect — ${rootOf(bogus).length} rules on "/"`,
  );

  const rule = rootOf(on)[0];
  if (!rule) {
    failures.push("6 — no `/` rule to inspect");
  } else {
    check(
      "6 — it points at the status host's root",
      rule.destination === "https://status.panameer.com/",
      `destination ${rule.destination}`,
    );
    /**
     * ⚠⚠⚠ 307, NEVER 308. This is "until R1": a browser that cached a permanent
     * redirect would keep sending people to the tracker after the marketplace
     * opened, and a cache you do not control is not a decision you can take back.
     */
    check(
      "7 — it is TEMPORARY (307), not permanent (308)",
      rule.permanent === false,
      `permanent: ${String(rule.permanent)}`,
    );
    const host = rule.has?.find((h) => h.type === "host")?.value;
    check("8 — it is conditioned on the host", typeof host === "string", `has: ${JSON.stringify(rule.has)}`);

    if (typeof host === "string") {
      const re = compiled(host);
      for (const h of ["panameer.com", "www.panameer.com"]) {
        check(`9 — ${h} is redirected`, re.test(h), `${re} did not match ${h}`);
      }
      /**
       * ⚠⚠⚠ `app.panameer.com` IS THE ONE THAT MATTERS MOST. `E780` includes it
       * for `/status`; including it HERE would 307 the signed-in app's root — the
       * dashboard door — to a public marketing page.
       */
      for (const h of [
        "app.panameer.com",
        "status.panameer.com",
        "localhost:3100",
        "localhost:3199",
        "panameer.vercel.app",
      ]) {
        check(`10 — ${h} is left alone`, !re.test(h), `${re} matched ${h}`);
      }
      /** ⚠⚠ `E780`'s lesson: alternation binds loosest, so an ungrouped value
       *  anchors only one end and a suffix attack matches. */
      for (const h of ["panameer.com.evil.net", "evil-panameer.com", "wwwpanameer.com", "xpanameer.com"]) {
        check(`11 — ${h} does not match`, !re.test(h), `${re} matched ${h} — the alternation is not grouped`);
      }
    }
  }

  /* ── E780's neighbour, re-asserted ─────────────────────────────────────── */

  const statusRule = on.find((r) => r.source === "/status");
  check("12 — `E780`'s /status rule still exists", !!statusRule, "lane 5 edits the same function");
  if (statusRule) {
    check(
      "13 — /status still points at the status host",
      statusRule.destination === "https://status.panameer.com/",
      `destination ${statusRule.destination}`,
    );
    const h = statusRule.has?.find((x) => x.type === "host")?.value ?? "";
    const re = compiled(h);
    check(
      "14 — /status still covers app.panameer.com (it must, unlike `/`)",
      re.test("app.panameer.com"),
      `${re} no longer matches app.panameer.com`,
    );
    check(
      "15 — /status still excludes the status host itself, so it cannot loop",
      !re.test("status.panameer.com"),
      `${re} matched status.panameer.com`,
    );
    check(
      "16 — /status still refuses a suffix attack",
      !re.test("panameer.com.evil.net"),
      `${re} matched panameer.com.evil.net`,
    );
  }

  /** ⚠ Leave the environment as it was found — this harness runs in the same
   *  process as whatever calls it next. */
  delete process.env.HOME_SHOWS_STATUS;

  if (failures.length > 0) {
    console.error(`check:home-switch — ${failures.length} FAILED, ${pass} passed\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`check:home-switch — ${pass}/${pass} passed`);
}

main();
