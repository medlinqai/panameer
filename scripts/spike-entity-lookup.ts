/**
 * `spike-entity-lookup` — ⚠⚠ A SPIKE. THROWAWAY. NOT A FEATURE (`P1-J1.1-E282` WS-1).
 *
 * The brief's condition, verbatim: *"IF WS-1 DOES NOT PROVE IT — no reachable
 * registry, or the only way to answer is the model's own memory — STOP. REPORT.
 * BUILD NOTHING. A validation that cannot be sourced is worse than no validation:
 * it puts a confident tick beside data nobody checked."*
 *
 * So this script exists to answer five questions with REAL network calls and
 * REAL measurements, per state, in the brief's tier order:
 *   (a) an official state API      ← preferred, and not scraping
 *   (b) a search-capable model call
 *   (c) nothing → `unavailable`, NEVER a guess
 *
 * ⚠ IT NEVER PRODUCES AN EIN. A state register does not publish one, and Texas's
 * 11-digit taxpayer number is NOT the federal EIN — it must never reach
 * `Company.tin`.
 *
 * Run:  npx esbuild scripts/spike-entity-lookup.ts --bundle --platform=node \
 *         --format=cjs --packages=external --alias:@=./src \
 *         --outfile=.harness/spike.cjs && node -r dotenv/config .harness/spike.cjs \
 *         dotenv_config_path=.env.local
 */
import Anthropic from "@anthropic-ai/sdk";

type Tier = "a-official-api" | "b-model-search" | "c-none";
type Probe = {
  state: string;
  query: string;
  tier: Tier;
  mechanism: string;
  sourceUrl: string;
  ms: number;
  matches: number;
  fields: Record<string, string | null>;
  costUsd?: number | null;
  note?: string;
};

const out: Probe[] = [];
const t0 = () => Date.now();

/* ── (a) SOCRATA-BACKED OFFICIAL STATE PORTALS ────────────────────────────── */

async function socrata(
  state: string,
  host: string,
  dataset: string,
  nameCol: string,
  query: string,
  map: (r: Record<string, string>) => Record<string, string | null>
): Promise<Probe> {
  const url =
    `https://${host}/resource/${dataset}.json` +
    `?$where=${encodeURIComponent(`starts_with(upper(${nameCol}),'${query.toUpperCase()}')`)}` +
    `&$limit=10`;
  const start = t0();
  const r = await fetch(url, { headers: { accept: "application/json" } });
  const ms = t0() - start;
  const rows = (await r.json()) as Record<string, string>[];
  return {
    state,
    query,
    tier: "a-official-api",
    mechanism: `${host} Socrata dataset ${dataset} (official state open-data portal)`,
    sourceUrl: url,
    ms,
    matches: rows.length,
    fields: rows.length ? map(rows[0]) : {},
  };
}

const TEXAS = (q: string) =>
  socrata("Texas", "data.texas.gov", "9cir-efmm", "taxpayer_name", q, (r) => ({
    legalName: r.taxpayer_name ?? null,
    entityNumber: r.secretary_of_state_sos_or_coa_file_number ?? null,
    status: r.right_to_transact_business_code ?? null,
    sosStatus: r.sos_status_code ?? null,
    formationDate: r.sos_charter_date ?? null,
    entityType: r.taxpayer_organizational_type ?? null,
    addressLine1: r.taxpayer_address ?? null,
    city: r.taxpayer_city ?? null,
    stateCode: r.taxpayer_state ?? null,
    postalCode: r.taxpayer_zip ?? null,
    /* ⚠⚠ ELEVEN DIGITS. THE TEXAS COMPTROLLER NUMBER, **NOT** THE FEDERAL EIN.
       Captured here ONLY to prove the §2 correction; it must never be written
       to `Company.tin`. */
    texasTaxpayerNumber_NOT_EIN: r.taxpayer_number ?? null,
  }));

const COLORADO = (q: string) =>
  socrata("Colorado", "data.colorado.gov", "4ykn-tg5h", "entityname", q, (r) => ({
    legalName: r.entityname ?? null,
    entityNumber: r.entityid ?? null,
    status: r.entitystatus ?? null,
    formationDate: r.entityformdate ?? null,
    entityType: r.entitytype ?? null,
    jurisdiction: r.jurisdictonofformation ?? null,
    addressLine1: r.principaladdress1 ?? null,
    city: r.principalcity ?? null,
    stateCode: r.principalstate ?? null,
    postalCode: r.principalzipcode ?? null,
    registeredAgent:
      r.agentorganizationname ??
      (`${r.agentfirstname ?? ""} ${r.agentlastname ?? ""}`.trim() || null),
  }));

/* ── (b) A SEARCH-CAPABLE MODEL CALL — the server-side web tools ──────────── */

/**
 * ⚠⚠ THIS IS NOT "ASK THE MODEL WHAT IT REMEMBERS". The server-side `web_search`
 * and `web_fetch` tools make the model READ LIVE PAGES and return the URLs it
 * read. The whole point of the tier is that every field can be traced to a
 * source; a call without those tools would be memory and the brief forbids it.
 */
async function modelSearch(state: string, query: string): Promise<Probe> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const start = t0();
  const res = await client.beta.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2000,
    tools: [
      { type: "web_search_20250305", name: "web_search", max_uses: 6 } as never,
      { type: "web_fetch_20250910", name: "web_fetch", max_uses: 6 } as never,
    ],
    betas: ["web-fetch-2025-09-10"],
    messages: [
      {
        role: "user",
        content:
          `Look up the business entity "${query}" in the ${state} Secretary of State / ` +
          `Division of Corporations corporate register. Use the official state register only.\n\n` +
          `Return ONLY a JSON object with these keys (null where the register does not publish it):\n` +
          `legalName, entityNumber, status, formationDate, entityType, addressLine1, city, ` +
          `stateCode, postalCode, registeredAgent, sourceUrl, matchCount.\n\n` +
          `RULES:\n` +
          `- NEVER return an EIN or any federal tax id. State registers do not publish them.\n` +
          `- If you cannot READ the register itself, set every field to null and put the ` +
          `reason in a "reason" key. DO NOT answer from memory.\n` +
          `- sourceUrl must be the official page you actually read.`,
      },
    ],
  });
  const ms = t0() - start;
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n");
  const m = /\{[\s\S]*\}/.exec(text);
  let parsed: Record<string, unknown> = {};
  try {
    parsed = m ? JSON.parse(m[0]) : {};
  } catch {
    /* leave empty — reported as unparsed */
  }
  const u = res.usage as unknown as Record<string, number>;
  /* Sonnet list price, in $/M tokens. Search is billed per-use on top. */
  const cost = ((u.input_tokens ?? 0) / 1e6) * 3 + ((u.output_tokens ?? 0) / 1e6) * 15;
  const searches = (res.content.filter((b) => b.type === "server_tool_use").length);
  return {
    state,
    query,
    tier: "b-model-search",
    mechanism: `claude-sonnet-5 + server-side web_search/web_fetch (${searches} tool uses)`,
    sourceUrl: String(parsed.sourceUrl ?? "—"),
    ms,
    matches: Number(parsed.matchCount ?? (parsed.legalName ? 1 : 0)),
    fields: Object.fromEntries(
      ["legalName", "entityNumber", "status", "formationDate", "entityType", "addressLine1", "city", "stateCode", "postalCode", "registeredAgent"].map(
        (k) => [k, parsed[k] == null ? null : String(parsed[k])]
      )
    ),
    costUsd: Number((cost + searches * 0.01).toFixed(4)),
    note: parsed.reason ? `reason: ${String(parsed.reason)}` : text.slice(0, 200),
  };
}

/* ── the run ──────────────────────────────────────────────────────────────── */

async function main() {
  const show = (p: Probe) => {
    out.push(p);
    console.log(`\n── ${p.state} · "${p.query}" ──`);
    console.log(`  tier      : ${p.tier}`);
    console.log(`  mechanism : ${p.mechanism}`);
    console.log(`  latency   : ${p.ms} ms`);
    console.log(`  matches   : ${p.matches}`);
    if (p.costUsd != null) console.log(`  cost      : $${p.costUsd}`);
    console.log(`  source    : ${p.sourceUrl.slice(0, 150)}`);
    for (const [k, v] of Object.entries(p.fields)) console.log(`    ${k.padEnd(28)} ${v ?? "—"}`);
    if (p.note) console.log(`  note      : ${p.note}`);
  };

  console.log("═══ TIER (a) — OFFICIAL STATE APIs ═══");
  show(await TEXAS("DELL TECHNOLOGIES"));
  show(await COLORADO("CHIPOTLE MEXICAN GRILL"));

  console.log("\n═══ EDGE CASES ═══");
  show(await TEXAS("ZZQX NOT A REAL COMPANY"));
  show(await COLORADO("CHIPOTLE"));

  console.log("\n═══ TIER (b) — DELAWARE, no open dataset exists ═══");
  try {
    show(await modelSearch("Delaware", "Alphabet Inc."));
  } catch (e) {
    console.log(`  ⚠ tier (b) FAILED: ${(e as Error).message}`);
  }
}

main().then(() => console.log("\nspike complete"));
