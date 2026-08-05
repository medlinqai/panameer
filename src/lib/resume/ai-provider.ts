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
  | { ok: false; reason: "no_key" | "truncated" | "error"; message: string };

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
}: {
  system: string;
  schema: Record<string, unknown>;
  schemaName: string;
  text: string;
  maxOutputTokens?: number;
}): Promise<ModelCall> {
  const cfg = resolveProvider();
  if (!cfg) {
    return { ok: false, reason: "no_key", message: "AI extraction is not configured." };
  }

  const started = Date.now();
  const userContent = `Extract this résumé.\n\n<resume>\n${text.slice(0, 120_000)}\n</resume>`;

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
            description: "Record the structured contents of this résumé.",
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
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict: false,
            schema,
          },
        },
      }),
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
      };
    };
    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") {
      return {
        ok: false,
        reason: "truncated",
        message:
          "Your document is long enough that the reader ran out of room. Try again, or add your work history manually.",
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
      },
      ms: Date.now() - started,
    };
  } catch (e) {
    console.error("[resume] model call failed:", e);
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "The model call failed.",
    };
  }
}
