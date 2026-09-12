import { MODEL_TIMEOUT_MS } from "@/lib/resume/budget";
import { env } from "@/lib/env";

/**
 * THE MODEL CALL, with the vendor factored out (brief_j14 WS-A).
 *
 * Résumé parsing is commodity extraction — read a document, fill a fixed shape —
 * and it was running on a frontier model. This module makes the provider, the
 * model, the endpoint and the PRICES configuration, so an economy tier can be
 * swapped in and A/B'd against the incumbent without touching code.
 *
 * TWO TRANSPORTS, one result shape:
 *   openai     any OpenAI-compatible /chat/completions endpoint (that includes
 *              Gemini's compatibility layer), using response_format json_schema
 *              so the shape is the model's obligation rather than our hope.
 *   anthropic  the incumbent tool-call path, kept reachable for comparison.
 *
 * COST COMES BACK WITH THE ANSWER. Every call returns real token usage and, when
 * prices are configured, the dollar cost of that call. Cost you cannot see is
 * cost you cannot cut, and the entire point of this workstream is a number.
 *
 * THE PROMPT PREFIX IS STABLE ON PURPOSE. System text and schema are identical
 * on every call and the résumé is the only thing that varies, which is the shape
 * both vendors' prompt caches reward. Anthropic gets an explicit cache_control
 * breakpoint; OpenAI-compatible endpoints cache long prefixes automatically.
 */

export type ProviderName = "openai" | "anthropic";

/**
 * How long any single model call may take before it is abandoned (WS-4).
 *
 * 55s, under the 60s `maxDuration` both résumé routes declare. The ordering is
 * the point: whichever limit fires first decides what the provider sees, and a
 * platform timeout produces a 504 with no body — no message for the UI, nothing
 * in the logs. Losing the race to our own deadline produces a sentence instead.
 */
/*
  ⚠ SUPERSEDED, quoted not deleted (`P1-A1.4-E415` WS-2):

      const MODEL_TIMEOUT_MS = 55_000;

  ⚠⚠ FIFTY-FIVE SECONDS INSIDE A ROUTE THAT HAS SIXTY, with a mandatory serial
  pass in front of it. That is not a tight budget, it is an impossible one — and
  it was impossible because two literals in two files had no way to know about
  each other. ⚠ IT IS NOW DERIVED: see `lib/resume/budget.ts`, which states the
  relationship and the measurements behind it.
*/

/**
 * Does this model treat `max_completion_tokens` as a budget it can spend
 * THINKING, and accept `reasoning_effort` to bound that?
 *
 * A name test, because there is no capability endpoint to ask and this module
 * deliberately talks to any OpenAI-compatible vendor. Wrong-negative is safe —
 * the parameter is simply not sent, which is today's behaviour. Wrong-positive
 * is a 400 on an unknown parameter, so the patterns stay narrow and explicit
 * rather than clever.
 */
function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return /^(gpt-5|o1|o3|o4)/.test(m);
}

/**
 * WHICH TIER IS RUNNING — the thing E184 is about.
 *
 * `economy` is the configured `RESUME_PARSER_*` trio; `incumbent` is the
 * Anthropic key that has always been there. The distinction was previously
 * derivable only by reading this file and the environment side by side, which is
 * how a silent fall-through to the expensive path — or to no path at all —
 * stayed invisible for a whole walk.
 */
export type ParserTier = "economy" | "incumbent";

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from the provider's prompt cache, when it reports them. */
  cachedInputTokens: number;
  /** USD for this call, or null when prices aren't configured. */
  costUsd: number | null;
  /*
    ── ⚠⚠ THE TWO FIELDS THAT SEPARATE "STOPPED" FROM "SKIPPED" (`P1-A1.4-E399`) ──

    ⚠ `finishReason` IS THE DIAGNOSTIC THAT WAS MISSING. `E399` traced a parse that
    returned one employer of five: a model that STOPPED reports `length` /
    `max_tokens`, a model that SUMMARISED reports `stop` and looks perfect. Same
    short result, opposite causes, opposite fixes — and until now the same evidence.
    ⚠ Carried on the SUCCESS path deliberately: the failure paths already hard-fail
    loudly, so the value that was never visible is the one on a call that "worked".

    ⚠ `reasoningTokens` is what a thinking model spent before emitting anything.
    Measured on `gpt-5-nano`: 6,656 on default effort, 0 on `minimal`.
  */
  finishReason: string | null;
  reasoningTokens: number;
};

export type ModelCall =
  | {
      ok: true;
      /** The parsed JSON object the model produced. Validation is the caller's. */
      value: unknown;
      provider: ProviderName;
      /** Which tier answered — carried out with the result so callers can say so. */
      tier: ParserTier;
      model: string;
      usage: ModelUsage;
      ms: number;
    }
  /*
    ⚠ `"refusal"` IS ITS OWN REASON (`P1-A1.4-E414` WS-2). A refusal is a DECISION
    the model made about the content it was handed; an error is a failure of the
    machinery. Collapsing them means nobody can count how often the first
    happens — and `import.ts` records this string on `ImportPath.reason`, so the
    distinction survives into the row rather than living only in a log line.
  */
  | { ok: false; reason: "no_key" | "truncated" | "error" | "refusal"; message: string };

/** Which provider will actually run, given what's configured. */
export function resolveProvider(): {
  tier: ParserTier;
  provider: ProviderName;
  model: string;
  apiKey: string;
  baseUrl: string;
} | null {
  const explicit = env.RESUME_PARSER_PROVIDER;

  // The configured parser wins when it is COMPLETE. A half-set trio (key but no
  // model) silently falling back to the expensive incumbent is exactly the kind
  // of quiet regression this workstream exists to remove, so it is reported by
  // `parserConfigProblem()` instead.
  if (env.RESUME_PARSER_API_KEY && env.RESUME_PARSER_MODEL) {
    const provider: ProviderName = explicit ?? "openai";
    return {
      tier: "economy",
      provider,
      model: env.RESUME_PARSER_MODEL,
      apiKey: env.RESUME_PARSER_API_KEY,
      baseUrl:
        env.RESUME_PARSER_BASE_URL?.replace(/\/+$/, "") ?? "https://api.openai.com/v1",
    };
  }

  if (env.ANTHROPIC_API_KEY) {
    return {
      tier: "incumbent",
      provider: "anthropic",
      /*
        The literal fallback is not redundant. `env.ts` degrades to raw
        process.env whenever ANY variable fails validation, and that throws away
        every schema DEFAULT — including this model id. The symptom is a 400
        "model: Field required" from a call that looks perfectly configured,
        which cost a debugging round the first time it happened.

        E184 — THIS MODEL ID WAS VERIFIED, not assumed. The brief's hypothesis
        was that `claude-sonnet-5` 404s and that the 404 is why imports read as
        "non-AI AI". It does not: probed against the live `ANTHROPIC_API_KEY`
        with this exact request shape (cached system block, forced tool_choice,
        16k max_tokens) it returns a `tool_use` block. The real cause was that
        `importProfileDocument` never called this module at all — see `import.ts`.
      */
      model: env.ANTHROPIC_RESUME_MODEL || "claude-sonnet-5",
      apiKey: env.ANTHROPIC_API_KEY,
      baseUrl: "",
    };
  }

  return null;
}

/**
 * A half-configured parser, described in one line — for the admin health card
 * and the eval script. Null when the configuration is coherent.
 */
export function parserConfigProblem(): string | null {
  const key = !!env.RESUME_PARSER_API_KEY;
  const model = !!env.RESUME_PARSER_MODEL;
  if (key && !model) return "RESUME_PARSER_API_KEY is set but RESUME_PARSER_MODEL is not — falling back to the incumbent model.";
  if (model && !key) return "RESUME_PARSER_MODEL is set but RESUME_PARSER_API_KEY is not — falling back to the incumbent model.";
  if (key && model && env.RESUME_PARSER_PRICE_IN_PER_M == null) {
    return "The parser is configured but its prices aren't — $/parse can't be computed until RESUME_PARSER_PRICE_IN_PER_M and _OUT_PER_M are set.";
  }
  /*
    E184 — NEITHER SET IS ALSO WORTH SAYING. It is not a misconfiguration, so
    it was silent; but "silently running the expensive incumbent" is precisely
    the state this whole workstream exists to make visible, and the difference
    between it and a deliberate choice is a sentence on the admin card.
  */
  if (!key && !model && env.ANTHROPIC_API_KEY) {
    return "No economy tier is configured — every parse runs on the incumbent model. Set RESUME_PARSER_MODEL + RESUME_PARSER_API_KEY to switch it.";
  }
  if (!key && !model && !env.ANTHROPIC_API_KEY) {
    return "No parser is configured at all — uploads fall back to the non-AI heuristic reader.";
  }
  return null;
}

/**
 * The active path in one line, for logs and for the import UI (E184).
 *
 * Deliberately names the MODEL, not just "AI". "We read your résumé with AI" is
 * the claim that was being made while no model ran; a claim carrying the model
 * id is one that can be checked at a glance during a walk.
 */
export function describeParser(): string {
  const cfg = resolveProvider();
  if (!cfg) return "heuristic reader (no model configured)";
  return `${cfg.tier} model (${cfg.model})`;
}

function priceFor(inTok: number, outTok: number): number | null {
  const pin = env.RESUME_PARSER_PRICE_IN_PER_M;
  const pout = env.RESUME_PARSER_PRICE_OUT_PER_M;
  if (pin == null || pout == null) return null;
  return (inTok / 1_000_000) * pin + (outTok / 1_000_000) * pout;
}

/**
 * Run one extraction.
 *
 * `system` and `schema` are the STABLE prefix; `text` is the only per-call
 * input. Never throws — every failure comes back as `{ ok: false }`, because
 * the caller's fallback is a heuristic result the user already has.
 */
export async function callExtractionModel({
  system,
  schema,
  schemaName,
  text,
  maxOutputTokens = 16_000,
  /*
    THE USER-MESSAGE WRAPPER, parameterised for the job-posting importer
    (brief_cwr_specializations_and_import WS-B). It was hardcoded to "Extract
    this résumé" inside `<resume>` tags, which is right for the one caller that
    existed and actively misleading for a caller handing the model a job post.

    THE DEFAULTS REPRODUCE THE OLD STRING EXACTLY, byte for byte. The résumé
    prompt is documented as fragile — change only with a before/after harness
    run — so the résumé path must not be able to tell this refactor happened.
    `check:resume` and `check:ai-extract` are the proof.
  */
  instruction = "Extract this résumé.",
  tag = "resume",
  toolDescription = "Record the structured contents of this résumé.",
  strict = false,
  timeoutMs,
}: {
  system: string;
  schema: Record<string, unknown>;
  schemaName: string;
  text: string;
  maxOutputTokens?: number;
  instruction?: string;
  tag?: string;
  toolDescription?: string;
  /*
    ── ⚠⚠ CONSTRAINED DECODING, OPTED INTO PER CALL SITE (`P1-A1.4-E414`) ────

    ⚠⚠ THE DEFAULT IS `false` AND THAT IS THE WHOLE DESIGN, not caution.
    `record_resume` — the legacy single-call schema in `ai-extract.ts` — shares
    this function and is NOT strict-ready: `E413`'s audit counted **10
    blockers**, five objects with no `additionalProperties: false` and five
    `required` lists omitting ~22 already-nullable properties. Under
    `strict: true` OpenAI REJECTS a non-conforming schema outright, so a
    blanket flip would take that path from "sometimes the wrong shape" to
    "always a 400". ⚠ OPT IN; NEVER OPT OUT.

    ⚠ WHAT IT ACTUALLY CHANGES. With `strict: false` the JSON schema is
    transmitted as part of the PROMPT — the model reads it and may answer in
    another shape. With `strict: true` the vendor constrains the sampler: a
    token that would depart from the schema cannot be emitted at all.
    ⚠ `ai-extract.ts:66` said this in writing long before it was acted on —
    *"the json_schema is a request, not a contract"* — and `:371` named
    `strict: true` as *"the durable fix … flagged in the report."* ⚠ THIS IS
    THAT FLAG COMING DUE.

    ⚠ THE SCHEMA MUST EARN IT. Every object needs `additionalProperties:
    false` and every property named in `required`, with optionality expressed
    as `type: ["string","null"]`. The six multi-pass schemas already satisfy
    this because `sub()` builds them that way; `check:strict-schema` §3
    asserts it for every schema sent with this flag, so a field added next
    month fails a gate rather than a live call.

    ⚠⚠ AND IT CONSTRAINS SHAPE, NOT CONTENT — see the note at the six call
    sites in `ai-passes.ts`. It does not make the parser correct; it makes the
    answer well-formed.
  */
  strict?: boolean;
  /*
    ── ⚠⚠ WHAT THE ROUTE HAS LEFT, NOT WHAT THIS CALL WOULD LIKE (`E415` WS-2) ──

    ⚠ OMITTED MEANS "no route around me" — the default `MODEL_TIMEOUT_MS` is
    used, which is what a script or a gate wants. ⚠ THE IMPORT ROUTE ALWAYS
    PASSES IT, computed by `callTimeoutMs()` from the moment the request began,
    so a call late in the chain is granted only the time that actually remains.
    ⚠⚠ THE INVARIANT HOLDS BY CONSTRUCTION: the value can never exceed
    `READ_BUDGET_MS`, which is strictly smaller than the route's `maxDuration`.
  */
  timeoutMs?: number;
}): Promise<ModelCall> {
  const cfg = resolveProvider();
  if (!cfg) {
    return { ok: false, reason: "no_key", message: "AI extraction is not configured." };
  }

  const started = Date.now();
  /* ⚠ ONE RESOLUTION FOR THE WHOLE CALL, so the message below quotes the number
     that was actually enforced rather than the constant. */
  const budgetMs = timeoutMs ?? MODEL_TIMEOUT_MS;
  const userContent = `${instruction}\n\n<${tag}>\n${text.slice(0, 120_000)}\n</${tag}>`;

  try {
    if (cfg.provider === "anthropic") {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey: cfg.apiKey });
      const response = await client.messages.create({
        model: cfg.model,
        max_tokens: maxOutputTokens,
        // The cache breakpoint sits at the end of the system block: everything
        // before it is byte-identical on every call.
        system: [
          {
            type: "text",
            text: system,
            cache_control: { type: "ephemeral" },
          },
        ] as never,
        tools: [
          {
            name: schemaName,
            description: toolDescription,
            input_schema: schema as never,
          },
        ],
        tool_choice: { type: "tool", name: schemaName },
        messages: [{ role: "user", content: userContent }],
      });

      if (response.stop_reason === "max_tokens") {
        return {
          ok: false,
          reason: "truncated",
          message:
            "Your document is long enough that the reader ran out of room. Try again, or add your work history manually.",
        };
      }
      const block = response.content.find((c) => c.type === "tool_use");
      if (!block || block.type !== "tool_use") {
        return { ok: false, reason: "error", message: "The model returned no structured output." };
      }

      const u = response.usage as unknown as {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
      };
      const inTok = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
      const outTok = u.output_tokens ?? 0;
      return {
        ok: true,
        value: block.input,
        provider: "anthropic",
        tier: cfg.tier,
        model: cfg.model,
        usage: {
          inputTokens: inTok,
          outputTokens: outTok,
          cachedInputTokens: u.cache_read_input_tokens ?? 0,
          costUsd: priceFor(inTok, outTok),
          /* ⚠ Anthropic calls it `stop_reason`; a clean finish is `end_turn`. */
          finishReason: response.stop_reason ?? null,
          /* Anthropic does not report a separate reasoning count on this path. */
          reasoningTokens: 0,
        },
        ms: Date.now() - started,
      };
    }

    /*
      OPENAI-COMPATIBLE. Raw fetch rather than a vendor SDK: this endpoint shape
      is implemented by several providers, and pulling in one vendor's client to
      talk to another vendor's compatibility layer is how you end up
      accidentally hardcoded to the SDK's assumptions.
    */
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_completion_tokens: maxOutputTokens,
        /*
          REASONING EFFORT — the fix for the AI pass "failing" (WS-4).

          `max_completion_tokens` on a reasoning model is a budget for REASONING
          PLUS the answer, not for the answer. gpt-5-nano at the vendor default
          (medium) spent 6,656 of its tokens thinking about Scott's résumé and
          54.8s doing it; on a longer document the thinking consumed the whole
          16k, the model emitted nothing, `finish_reason` came back "length" —
          and the branch below told him HIS DOCUMENT was too long. It was not.
          The reader had talked itself out of room.

          Measured on Scott's résumé, same request otherwise:

              default (medium)   54.8s   6,656 reasoning tokens   2,276 chars out
              low                16.0s   1,472 reasoning tokens   2,109 chars out
              minimal             1.3s       0 reasoning tokens      81 chars out

          `low` is 3.4x faster for the same answer. `minimal` is not a candidate
          at any speed — 81 characters is the model declining to do the job.

          SENT ONLY TO MODELS THAT UNDERSTAND IT. This endpoint shape is spoken
          by several vendors and older chat models 400 on an unknown parameter,
          so a name test gates it rather than sending it blindly.
        */
        ...(isReasoningModel(cfg.model)
          ? {
              /*
                The literal fallback is not redundant — same reason the model id
                two blocks up carries one. `env.ts` degrades to raw process.env
                if ANY variable fails validation, and that throws away every
                schema default including this one. Without the `||`, one
                unrelated bad env var silently restores the slow behaviour this
                whole block exists to fix.
              */
              reasoning_effort: env.RESUME_PARSER_REASONING_EFFORT || "low",
            }
          : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        /* ⚠ SUPERSEDED, quoted not deleted (`P1-A1.4-E414` WS-1) — this was a
           hardcoded `strict: false`, which made the schema a suggestion on every
           path in the product:

               json_schema: { name: schemaName, strict: false, schema },
        */
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict,
            schema,
          },
        },
      }),
      /*
        A DEADLINE, so a slow call fails as a sentence rather than as a dead
        request. Without it the only thing that ever stopped this call was the
        hosting platform's function timeout, which arrives as a 504 with no body
        — nothing for the UI to show and nothing in the logs to read.
      */
      signal: AbortSignal.timeout(budgetMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        reason: "error",
        message: `The model endpoint returned ${res.status}. ${body.slice(0, 300)}`,
      };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: { cached_tokens?: number };
        completion_tokens_details?: { reasoning_tokens?: number };
      };
    };
    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") {
      /*
        WHOSE FAULT WAS THE TRUNCATION (WS-4).

        This branch had one message and it blamed the document. On a reasoning
        model that is usually wrong: the budget is shared with the model's own
        thinking, so a 12-page résumé and a 2-page one truncate for completely
        different reasons and the 2-page case reads as an insult. Scott got
        exactly that — "your document is long enough that the reader ran out of
        room" on an eleven-thousand-character CV.

        The usage block says which happened, so it is asked rather than assumed.
      */
      const reasoningTokens =
        body.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
      const spentThinking = reasoningTokens > maxOutputTokens / 2;
      console.error(
        `[resume] truncated: completion=${body.usage?.completion_tokens} ` +
          `reasoning=${reasoningTokens} budget=${maxOutputTokens} model=${cfg.model}`
      );
      return {
        ok: false,
        reason: "truncated",
        message: spentThinking
          ? "The reader used up its budget working through your document and didn't get to an answer. Try again — nothing was changed."
          : "Your document is long enough that the reader ran out of room. Try again, or add your work history manually.",
      };
    }
    /*
      ── ⚠⚠ A REFUSAL IS NOT AN EMPTY RESPONSE (`P1-A1.4-E414` WS-2) ──────────

      ⚠ SUPERSEDED, quoted not deleted — the whole branch that stood here:

          const content = choice?.message?.content;
          if (!content) {
            return { ok: false, reason: "error", message: "The model returned no content." };
          }

      ⚠⚠ `refusal` APPEARED NOWHERE IN THIS FILE. Under structured outputs
      OpenAI may answer with `message.refusal` set and `message.content` NULL —
      so a refusal fell into the branch above and surfaced as *"The model
      returned no content."*: indistinguishable from a timeout, a network fault
      or an empty body, and a log line that sends the next reader hunting the
      wrong thing.

      ⚠⚠ WS-1 IS WHAT MAKES THIS REACHABLE. The refusal field is part of the
      structured-outputs contract, so enabling `strict` is what creates the
      exposure — which is why `E414` ships the two together and why this is not
      a pre-existing bug that could be left for later.

      ⚠ IT GETS ITS OWN `reason`, NOT `"error"`. A refusal is a DECISION by the
      model about the content it was given; an error is a failure of the
      machinery. Collapsing them means nobody can ever count how often the first
      happens. ⚠ The message says who decided and that nothing was changed —
      the person's next move is different in each case.
    */
    const refusal = (choice?.message as { refusal?: string } | undefined)?.refusal;
    if (refusal) {
      console.warn(`[resume] the model REFUSED: ${refusal.slice(0, 200)}`);
      return {
        ok: false,
        reason: "refusal",
        message:
          "The reader declined to process this document. Nothing was changed — you can add your work history manually.",
      };
    }

    const content = choice?.message?.content;
    if (!content) {
      return { ok: false, reason: "error", message: "The model returned no content." };
    }

    let value: unknown;
    try {
      value = JSON.parse(content);
    } catch {
      return {
        ok: false,
        reason: "error",
        message: "The model's output wasn't valid JSON.",
      };
    }

    const inTok = body.usage?.prompt_tokens ?? 0;
    const outTok = body.usage?.completion_tokens ?? 0;
    return {
      ok: true,
      value,
      provider: "openai",
      tier: cfg.tier,
      model: cfg.model,
      usage: {
        inputTokens: inTok,
        outputTokens: outTok,
        cachedInputTokens: body.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        costUsd: priceFor(inTok, outTok),
        /* ⚠ `stop` here means "the model decided it was done" — which is exactly
           what a model that SUMMARISED reports. See `ModelUsage`. */
        finishReason: choice?.finish_reason ?? null,
        reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      },
      ms: Date.now() - started,
    };
  } catch (e) {
    console.error("[resume] model call failed:", e);
    /*
      `AbortSignal.timeout` rejects with a TimeoutError DOMException whose own
      message is "The operation was aborted due to timeout" — accurate, and
      meaningless to a provider watching a spinner. Named explicitly so the
      deadline explains itself.
    */
    if (e instanceof Error && e.name === "TimeoutError") {
      return {
        ok: false,
        reason: "error",
        message: `The reader took longer than ${Math.round(budgetMs / 1000)}s and was stopped. Nothing was changed — try again, or add your work history manually.`,
      };
    }
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "The model call failed.",
    };
  }
}
