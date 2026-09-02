/**
 * PANAMEER VALIDATES THE ENTITY (`P1-J1.1-E282`).
 *
 * **SCOTT, 2026-08-31:** *"Every state has a Secretary of State website. They
 * list their corporations under a corporate search."* The user gives a company
 * name and the state it was filed in; Panameer looks up the rest.
 *
 * ── ⚠⚠ WHAT THE WS-1 SPIKE PROVED, AND WHAT IT DISPROVED ─────────────────────
 *
 * Measured 2026-09-02 with real network calls, not recalled:
 *
 *   TEXAS      ✅ tier (a) — data.texas.gov Socrata `9cir-efmm`, ~150-400ms, $0
 *   COLORADO   ✅ tier (a) — data.colorado.gov Socrata `4ykn-tg5h`, ~330-430ms, $0
 *   NEW YORK   ✅ tier (a) — data.ny.gov Socrata `n9v6-gdp6`, ~300ms, $0
 *   DELAWARE   ❌ NOT REACHABLE. No open dataset exists on data.delaware.gov, and
 *              `icis.corp.delaware.gov` needs a POST and possibly a CAPTCHA — a
 *              search-capable model call (tier b) spent 26s and $0.40 and came
 *              back with nothing, correctly refusing to answer from memory.
 *
 * ⚠⚠ SO DELAWARE — WHERE A LARGE SHARE OF US COMPANIES ARE ACTUALLY FILED —
 * RETURNS `unavailable`, AND THAT IS THE HONEST ANSWER. It is never guessed.
 * The brief predicted this shape exactly: *"a per-state adapter behind ONE
 * interface, with the API states built first and the gated ones left explicitly
 * unsupported rather than faked."*
 *
 * ── ⚠⚠ THERE IS NO EIN HERE, AND THERE NEVER WILL BE ─────────────────────────
 *
 * A state corporate register does not publish EINs — the EIN is federal. ⚠ AND
 * TEXAS'S `taxpayer_number` IS AN ELEVEN-DIGIT COMPTROLLER NUMBER, NOT THE
 * NINE-DIGIT FEDERAL EIN (`32106582219`, measured). Texas's own documentation
 * says the state number is *"based on"* the EIN but does not publish the
 * construction, so ONE CANNOT BE DERIVED FROM THE OTHER. ⚠ IT IS DELIBERATELY
 * NOT MAPPED INTO THIS RESULT AT ALL, so it cannot reach `Company.tin`, which is
 * the field the hire gate reads. `Company.tin` stays typed (`E273`).
 *
 * ── ⚠ EVERY FIELD CARRIES THE URL IT CAME FROM ───────────────────────────────
 *
 * Not one URL per lookup — one per field, because a caller that shows a value has
 * to be able to say where it came from. That is also what stops a future
 * "improvement" mixing a sourced field with an unsourced one.
 *
 * ── ⚠ THIS MODULE NEVER WRITES ───────────────────────────────────────────────
 *
 * `defineCompany()` remains the only writer. Keeping the read and the write apart
 * is what lets the user correct a bad lookup before anything is persisted.
 */

/** ⚠ Reusing `ai-provider.ts`'s failure shape — never throws to the caller. */
export type ValidationOutcome =
  | "validated"
  | "not_found"
  | "not_in_good_standing"
  | "unavailable";

export type SourcedField = {
  value: string;
  /** ⚠ THE EXACT URL THIS VALUE CAME FROM. */
  sourceUrl: string;
};

export type EntityMatch = {
  legalName: SourcedField;
  entityNumber?: SourcedField;
  /**
   * ⚠ ABSENT WHEN THE REGISTER DOES NOT PUBLISH ONE. New York's dataset is
   * "Active Corporations" — presence implies active but there is NO status
   * column, so this stays undefined for NY and the UI must not claim good
   * standing it did not read.
   */
  status?: SourcedField;
  formationDate?: SourcedField;
  entityType?: SourcedField;
  jurisdiction?: SourcedField;
  registeredAgent?: SourcedField;
  addressLine1?: SourcedField;
  city?: SourcedField;
  /** ⚠ The register's own two-letter code, as published. */
  stateCode?: SourcedField;
  postalCode?: SourcedField;
};

export type ValidationResult =
  | {
      ok: true;
      status: ValidationOutcome;
      /** The register's own name, for the UI to attribute to. */
      registerName: string;
      /** ⚠ MORE THAN ONE IS NORMAL and the UI has to handle it. */
      matches: EntityMatch[];
      /** How many the register returned before this was capped. */
      totalMatches: number;
      /** True when this state publishes a status field at all. */
      publishesStatus: boolean;
    }
  | {
      ok: false;
      reason: "unsupported_state" | "not_us" | "bad_input" | "timeout" | "error";
      message: string;
    };

/* ────────────────────────────────────────────────────────────────────────────
   THE ADAPTERS — one per state, behind one interface
   ──────────────────────────────────────────────────────────────────────────── */

type Adapter = {
  registerName: string;
  /** Socrata host + dataset + the column holding the entity name. */
  host: string;
  dataset: string;
  nameColumn: string;
  /** Does this register publish a status/good-standing field at all? */
  publishesStatus: boolean;
  map: (row: Record<string, string>, sourceUrl: string) => EntityMatch;
  /** Given the mapped row, is this entity in good standing? */
  goodStanding?: (row: Record<string, string>) => boolean;
};

const f = (v: string | undefined | null, sourceUrl: string): SourcedField | undefined =>
  v && String(v).trim() ? { value: String(v).trim(), sourceUrl } : undefined;

/**
 * ⚠ THE SUPPORTED SET IS EXACTLY WHAT WS-1 REACHED, and adding a state means
 * proving it the same way first. ⚠ A STATE THAT IS NOT HERE RETURNS
 * `unsupported_state` — never a guess, never a scrape.
 */
export const ADAPTERS: Record<string, Adapter> = {
  Texas: {
    registerName: "Texas Comptroller — Active Franchise Taxpayers",
    host: "data.texas.gov",
    dataset: "9cir-efmm",
    nameColumn: "taxpayer_name",
    publishesStatus: true,
    /* ⚠ `right_to_transact_business_code` IS THE GOOD-STANDING SIGNAL. Measured
       value for an active entity is `A`. Anything else is not asserted as good
       standing — it is reported as the register's own code. */
    goodStanding: (r) => String(r.right_to_transact_business_code ?? "").toUpperCase().startsWith("A"),
    map: (r, u) => ({
      legalName: { value: String(r.taxpayer_name), sourceUrl: u },
      entityNumber: f(r.secretary_of_state_sos_or_coa_file_number, u),
      /*
        ⚠ THE RAW CODE IS `A`, WHICH TELLS A READER NOTHING. Texas's
        `right_to_transact_business_code` of `A` means the entity has the RIGHT TO
        TRANSACT BUSINESS in Texas, so it is glossed to `Active` — which is what
        the field means and no more.
        ⚠ ANYTHING ELSE IS PASSED THROUGH VERBATIM rather than guessed at. A code
        this adapter has not been told the meaning of must not be translated into
        a reassuring word.
      */
      status: f(
        String(r.right_to_transact_business_code ?? "").toUpperCase() === "A"
          ? "Active — right to transact business"
          : r.right_to_transact_business_code,
        u
      ),
      formationDate: f(r.sos_charter_date, u),
      entityType: f(r.taxpayer_organizational_type, u),
      addressLine1: f(r.taxpayer_address, u),
      city: f(r.taxpayer_city, u),
      stateCode: f(r.taxpayer_state, u),
      postalCode: f(r.taxpayer_zip, u),
      /* ⚠⚠ `taxpayer_number` IS NOT MAPPED. It is the 11-digit Texas Comptroller
         number, NOT the federal EIN, and putting it anywhere near a tax id field
         would be wrong in the field the hire gate reads. */
    }),
  },
  Colorado: {
    registerName: "Colorado Secretary of State — Business Entities",
    host: "data.colorado.gov",
    dataset: "4ykn-tg5h",
    nameColumn: "entityname",
    publishesStatus: true,
    /* ⚠ COLORADO PUBLISHES THE PHRASE ITSELF — measured: `"Good Standing"`. */
    goodStanding: (r) => String(r.entitystatus ?? "").toLowerCase().includes("good standing"),
    map: (r, u) => ({
      legalName: { value: String(r.entityname), sourceUrl: u },
      entityNumber: f(r.entityid, u),
      status: f(r.entitystatus, u),
      formationDate: f(r.entityformdate, u),
      entityType: f(r.entitytype, u),
      jurisdiction: f(r.jurisdictonofformation, u),
      registeredAgent: f(
        r.agentorganizationname ??
          `${r.agentfirstname ?? ""} ${r.agentlastname ?? ""}`.trim(),
        u
      ),
      addressLine1: f(r.principaladdress1, u),
      city: f(r.principalcity, u),
      stateCode: f(r.principalstate, u),
      postalCode: f(r.principalzipcode, u),
    }),
  },
  "New York": {
    registerName: "New York Department of State — Active Corporations",
    host: "data.ny.gov",
    dataset: "n9v6-gdp6",
    nameColumn: "current_entity_name",
    /*
      ⚠⚠ NEW YORK PUBLISHES NO STATUS COLUMN. The dataset is *Active*
      Corporations, so being in it means the entity is listed as active — but
      there is no good-standing field to read. `publishesStatus: false` is what
      stops the UI claiming one, and it is why `validated` for NY means "found in
      the active register" and nothing stronger.
    */
    publishesStatus: false,
    map: (r, u) => ({
      legalName: { value: String(r.current_entity_name), sourceUrl: u },
      entityNumber: f(r.dos_id, u),
      formationDate: f(r.initial_dos_filing_date, u),
      entityType: f(r.entity_type, u),
      jurisdiction: f(r.jurisdiction, u),
      registeredAgent: f(r.dos_process_name, u),
      addressLine1: f(r.dos_process_address_1, u),
      city: f(r.dos_process_city, u),
      stateCode: f(r.dos_process_state, u),
      postalCode: f(r.dos_process_zip, u),
    }),
  },
};

export const SUPPORTED_STATES = Object.keys(ADAPTERS).sort();

/**
 * ⚠ EVERY US STATE, so the picker offers all of them and the UNSUPPORTED ones
 * fail HONESTLY rather than being hidden. Hiding Delaware would leave a user
 * wondering why their state is missing; telling them we cannot check it yet is
 * information.
 */
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
];

/** How many matches travel back. More than this is a "narrow it down" case. */
export const MAX_MATCHES = 8;

/**
 * Look a company up. ⚠ NEVER THROWS — every failure is an `{ ok: false }`.
 *
 * ⚠ `unavailable` IS A FIRST-CLASS OUTCOME, not an error to swallow. The UI has
 * to be able to say "we couldn't check right now" and let the user carry on
 * typing, because a failed lookup never blocks Continue (decision 5).
 */
export async function validateEntity(input: {
  name: string;
  stateOfFiling: string;
  timeoutMs?: number;
}): Promise<ValidationResult> {
  const name = (input.name ?? "").trim();
  const state = (input.stateOfFiling ?? "").trim();
  if (!name || name.length < 2) {
    return { ok: false, reason: "bad_input", message: "Enter the company's legal name." };
  }
  if (!US_STATES.includes(state)) {
    return { ok: false, reason: "not_us", message: "Pick the US state the company was filed in." };
  }

  const adapter = ADAPTERS[state];
  if (!adapter) {
    /*
      ⚠⚠ THE HONEST DEAD END. `Delaware` lands here, and it is the single most
      important state commercially. Saying so is the whole point — the
      alternative is a confident tick beside data nobody checked.
    */
    return {
      ok: false,
      reason: "unsupported_state",
      message: `Panameer can't check ${state}'s register yet, so nothing here has been verified.`,
    };
  }

  /* ⚠ SoQL string literals are single-quoted; a quote in the name would break
     the predicate, so it is doubled the way SQL requires. */
  const needle = name.toUpperCase().replace(/'/g, "''");
  const url =
    `https://${adapter.host}/resource/${adapter.dataset}.json` +
    `?$where=${encodeURIComponent(`starts_with(upper(${adapter.nameColumn}),'${needle}')`)}` +
    `&$limit=${MAX_MATCHES + 1}`;

  let rows: Record<string, string>[];
  try {
    const ctl = AbortSignal.timeout(input.timeoutMs ?? 8000);
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: ctl });
    if (!r.ok) {
      return {
        ok: false,
        reason: "error",
        message: `${adapter.registerName} answered ${r.status}.`,
      };
    }
    rows = (await r.json()) as Record<string, string>[];
  } catch (e) {
    const timedOut = e instanceof Error && /abort|timeout/i.test(e.name + e.message);
    return {
      ok: false,
      reason: timedOut ? "timeout" : "error",
      message: timedOut
        ? "The register didn't answer in time. Nothing has been checked."
        : "We couldn't reach the register just now. Nothing has been checked.",
    };
  }

  if (rows.length === 0) {
    return {
      ok: true,
      status: "not_found",
      registerName: adapter.registerName,
      matches: [],
      totalMatches: 0,
      publishesStatus: adapter.publishesStatus,
    };
  }

  const capped = rows.slice(0, MAX_MATCHES);
  const matches = capped.map((r) => adapter.map(r, url));

  /*
    ⚠ STATUS IS JUDGED ON THE FIRST MATCH ONLY, and only where the register
    publishes one. With several matches the UI is asking the user which entity
    they meant, so asserting a status across all of them would be asserting
    something about rows they have not picked.
  */
  let status: ValidationOutcome = "validated";
  if (adapter.publishesStatus && adapter.goodStanding && !adapter.goodStanding(capped[0])) {
    status = "not_in_good_standing";
  }

  return {
    ok: true,
    status,
    registerName: adapter.registerName,
    matches,
    totalMatches: rows.length > MAX_MATCHES ? rows.length : capped.length,
    publishesStatus: adapter.publishesStatus,
  };
}
