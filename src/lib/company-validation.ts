
export type ValidationOutcome =
  | "validated"
  | "not_found"
  | "not_in_good_standing"
  | "unavailable";

export type SourcedField = {
  value: string;
  sourceUrl: string;
};

export type EntityMatch = {
  legalName: SourcedField;
  entityNumber?: SourcedField;
  status?: SourcedField;
  formationDate?: SourcedField;
  entityType?: SourcedField;
  jurisdiction?: SourcedField;
  registeredAgent?: SourcedField;
  addressLine1?: SourcedField;
  city?: SourcedField;
  stateCode?: SourcedField;
  postalCode?: SourcedField;
};

export type ValidationResult =
  | {
      ok: true;
      status: ValidationOutcome;
      /** The register's own name, for the UI to attribute to. */
      registerName: string;
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

type SearchResult = { rows: Record<string, string>[]; sourceUrl: string; status: number };

type Adapter = {
  registerName: string;
  host: string;
  dataset: string;
  nameColumn: string;
  search: ((needle: string, signal: AbortSignal) => Promise<SearchResult>) & {
    url?: (needle: string) => string;
  };
  /** Does this register publish a status/good-standing field at all? */
  publishesStatus: boolean;
  map: (row: Record<string, string>, sourceUrl: string) => EntityMatch;
  /** Given the mapped row, is this entity in good standing? */
  goodStanding?: (row: Record<string, string>) => boolean;
};

export function socrataAdapter(cfg: { host: string; dataset: string; nameColumn: string }) {
  const search = async (needle: string, signal: AbortSignal): Promise<SearchResult> => {
    const sourceUrl = socrataUrl(cfg, needle);
    const r = await fetch(sourceUrl, { headers: { accept: "application/json" }, signal });
    if (!r.ok) return { rows: [], sourceUrl, status: r.status };
    return { rows: (await r.json()) as Record<string, string>[], sourceUrl, status: r.status };
  };
  search.url = (needle: string) => socrataUrl(cfg, needle);
  return search;
}

export function socrataUrl(
  cfg: { host: string; dataset: string; nameColumn: string },
  needle: string
): string {
  return (
    `https://${cfg.host}/resource/${cfg.dataset}.json` +
    `?$where=${encodeURIComponent(`starts_with(upper(${cfg.nameColumn}),'${needle}')`)}` +
    `&$limit=${MAX_MATCHES + 1}`
  );
}

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
    search: socrataAdapter({ host: "data.texas.gov", dataset: "9cir-efmm", nameColumn: "taxpayer_name" }),
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
    search: socrataAdapter({ host: "data.colorado.gov", dataset: "4ykn-tg5h", nameColumn: "entityname" }),
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
    search: socrataAdapter({ host: "data.ny.gov", dataset: "n9v6-gdp6", nameColumn: "current_entity_name" }),
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

  /* ═══ ADDED BY `P1-J1.1-E387`. Each proved by a MEASURED call, 2026-09-08 ═══
     ⚠ THE PROVING PROTOCOL: date, latency, the name column read off a RETURNED
     ROW (never a field list), whether a status column exists at all, and one
     real sample. A lead that was not called is not an adapter. */

  /**
   * CONNECTICUT — measured 2026-09-08.
   *   probe `?$limit=1` .............. 471ms, 12 columns
   *   production query shape ......... 355ms, 9 rows, 9 DISTINCT names ✓
   *   sample row ..... {"name":"ACME 2 REALTY, L.L.C.","status":"Active"}
   *
   * ⚠⚠ THE STATUS VALUES WERE READ OFF THE REGISTER, NOT GUESSED FROM THE COLUMN
   * NAME. Grouped over the whole dataset, the register's own values are:
   *   Active 459,523 · Forfeited 357,259 · Dissolved 318,882 · Withdrawn 53,760 ·
   *   Revoked 46,479 · Cancelled 18,795 · Merged 12,710 · Expired Reservation
   *   12,045 · Rejected 9,314 · … 25 distinct values in all.
   *
   * ⚠ SO `goodStanding` IS EXACT-MATCH `Active`, NOT A PREFIX. `Active - Pending
   * Domestication` (2 rows) is deliberately NOT asserted as good standing — it is
   * passed through verbatim, the same way Texas treats any code that is not `A`.
   * ⚠⚠ AND NO SECOND GLOSS IS ADDED: the string travels into
   * `entity_status_detail` exactly as the register wrote it. Texas's `A` remains
   * the only translation in this codebase.
   */
  Connecticut: {
    registerName: "Connecticut Secretary of the State — Business Registry",
    host: "data.ct.gov",
    dataset: "n7gp-d28j",
    nameColumn: "name",
    search: socrataAdapter({ host: "data.ct.gov", dataset: "n7gp-d28j", nameColumn: "name" }),
    publishesStatus: true,
    goodStanding: (r) => String(r.status ?? "").trim() === "Active",
    map: (r, u) => ({
      legalName: { value: String(r.name), sourceUrl: u },
      entityNumber: f(r.accountnumber, u),
      formationDate: f(r.date_registration, u),
      status: f(r.status, u),
    }),
  },

  /**
   * PENNSYLVANIA — measured 2026-09-08.
   *   probe `?$limit=1` .............. 383ms, 17 columns
   *   production query shape ......... 129ms, 9 rows
   *   sample row ..... {"business_name":"Macro, Inc.","filing_number":"0006436709",
   *                     "typeofbusinessregistration":"Foreign Business Corporation"}
   *
   * ⚠⚠ NO STATUS COLUMN EXISTS, so `publishesStatus: false` — the safe default and
   * the honest one. Being in this dataset means a registration was filed; it does
   * NOT mean the entity is currently in good standing, and nothing here claims it.
   *
   * ⚠ MATCHING SEMANTICS DIFFER FROM THE OTHERS AND IT IS REPORTED, NOT PAPERED
   * OVER: a row is a PARTY on a filing (`party_type: "Governor"`), so one entity
   * can occupy several rows. Measured: a 9-row page for `ACME` held 7 distinct
   * names. The user sees a slightly short list, never a wrong one.
   */
  Pennsylvania: {
    registerName: "Pennsylvania Department of State — Business Registrations",
    host: "data.pa.gov",
    dataset: "xvd7-5r2c",
    nameColumn: "business_name",
    search: socrataAdapter({ host: "data.pa.gov", dataset: "xvd7-5r2c", nameColumn: "business_name" }),
    publishesStatus: false,
    map: (r, u) => ({
      legalName: { value: String(r.business_name), sourceUrl: u },
      entityNumber: f(r.filing_number, u),
      formationDate: f(r.creationdate, u),
      entityType: f(r.typeofbusinessregistration, u),
      addressLine1: f(r.address_line1, u),
      city: f(r.city, u),
      stateCode: f(r.state, u),
      postalCode: f(r.zip, u),
    }),
  },

  /**
   * OREGON — measured 2026-09-08.
   *   probe `?$limit=1` .............. 475ms, 11 columns
   *   production query shape ......... 211ms, 9 rows
   *   sample row ..... {"business_name":"ACME ACRES","registry_number":"299818",
   *                     "entity_type":"DOMESTIC NONPROFIT CORPORATION"}
   *
   * ⚠⚠ NO STATUS COLUMN, so `publishesStatus: false`. The dataset is titled
   * *Active Businesses — ALL*, and a TITLE IS NOT A FIELD: nothing here claims
   * good standing from the name of a file.
   *
   * ⚠⚠ THE WORST DUPLICATION OF THE THREE, MEASURED AND REPORTED: a row is an
   * ASSOCIATED NAME (`associated_name_type: "PRINCIPAL PLACE OF BUSINESS"`), so
   * one registry number spans many rows. A 9-row page for `ACME` held only
   * **3 DISTINCT NAMES** — the same company four times over. ⚠ A buyer typing a
   * partial name sees a short, repetitive list. `E387` reports this rather than
   * adding a de-duplication step, because de-duplicating would change the shared
   * search contract for the three states that already work, and WS-1 forbids
   * exactly that. **Scott's call whether it ships as-is or waits for a
   * `dedupeBy` field.**
   */
  Oregon: {
    registerName: "Oregon Secretary of State — Active Businesses",
    host: "data.oregon.gov",
    dataset: "tckn-sxa6",
    nameColumn: "business_name",
    search: socrataAdapter({ host: "data.oregon.gov", dataset: "tckn-sxa6", nameColumn: "business_name" }),
    publishesStatus: false,
    map: (r, u) => ({
      legalName: { value: String(r.business_name), sourceUrl: u },
      entityNumber: f(r.registry_number, u),
      formationDate: f(r.registry_date, u),
      entityType: f(r.entity_type, u),
      jurisdiction: f(r.jurisdiction, u),
      addressLine1: f(r.address, u),
      city: f(r.city, u),
      stateCode: f(r.state, u),
      postalCode: f(r.zip, u),
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

  /* ⚠⚠ THE ADAPTER BUILDS ITS OWN REQUEST NOW (`E387` WS-1). `validateEntity` no
     longer knows what a Socrata URL looks like — it knows only that an adapter
     can be asked for rows. The URL a Socrata adapter produces is unchanged and
     asserted byte-for-byte in `check:trust-claims`. */
  let rows: Record<string, string>[];
  let url: string;
  try {
    const ctl = AbortSignal.timeout(input.timeoutMs ?? 8000);
    const found = await adapter.search(needle, ctl);
    url = found.sourceUrl;
    if (found.status !== 200) {
      return {
        ok: false,
        reason: "error",
        message: `${adapter.registerName} answered ${found.status}.`,
      };
    }
    rows = found.rows;
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
