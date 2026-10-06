import { MODEL_TIMEOUT_MS } from "@/lib/resume/budget";
import { env } from "@/lib/env";

export type ProviderName = "openai" | "anthropic";

export function redactSecrets(text: string): string {
  return text
    .replace(/\b(?:sk|pk|rk)-[A-Za-z0-9_\-*.…]{4,}/gi, "[key redacted]")
    .replace(/\bBearer\s+[A-Za-z0-9_\-*.…]+/gi, "Bearer [key redacted]");
}

function isReasoningModel(model: string): boolean {
  const m = model.toLowerCase();
  return /^(gpt-5|o1|o3|o4)/.test(m);
}

export type ParserTier = "economy" | "incumbent";

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from the provider's prompt cache, when it reports them. */
  cachedInputTokens: number;
  /** USD for this call, or null when prices aren't configured. */
  costUsd: number | null;
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
  | { ok: false; reason: "no_key" | "truncated" | "error" | "refusal" | "deadline"; message: string };

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
      model: env.ANTHROPIC_RESUME_MODEL || "claude-sonnet-5",
      apiKey: env.ANTHROPIC_API_KEY,
      baseUrl: "",
    };
  }

  return null;
}

export function parserConfigProblem(): string | null {
  const key = !!env.RESUME_PARSER_API_KEY;
  const model = !!env.RESUME_PARSER_MODEL;
  if (key && !model) return "RESUME_PARSER_API_KEY is set but RESUME_PARSER_MODEL is not — falling back to the incumbent model.";
  if (model && !key) return "RESUME_PARSER_MODEL is set but RESUME_PARSER_API_KEY is not — falling back to the incumbent model.";
  if (key && model && env.RESUME_PARSER_PRICE_IN_PER_M == null) {
    return "The parser is configured but its prices aren't — $/parse can't be computed until RESUME_PARSER_PRICE_IN_PER_M and _OUT_PER_M are set.";
  }
  if (!key && !model && env.ANTHROPIC_API_KEY) {
    return "No economy tier is configured — every parse runs on the incumbent model. Set RESUME_PARSER_MODEL + RESUME_PARSER_API_KEY to switch it.";
  }
  if (!key && !model && !env.ANTHROPIC_API_KEY) {
    return "No parser is configured at all — uploads fall back to the non-AI heuristic reader.";
  }
  return null;
}

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

/** Run one extraction. */
export async function callExtractionModel({
  system,
  schema,
  schemaName,
  text,
  maxOutputTokens = 16_000,
  // THE USER-MESSAGE WRAPPER, parameterised for the job-posting importer
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
  // CONSTRAINED DECODING, OPTED INTO PER CALL SITE
  strict?: boolean;
  // WHAT THE ROUTE HAS LEFT, NOT WHAT THIS CALL WOULD LIKE ( WS-2)
  timeoutMs?: number;
}): Promise<ModelCall> {
  const cfg = resolveProvider();
  if (!cfg) {
    return { ok: false, reason: "no_key", message: "AI extraction is not configured." };
  }

  const started = Date.now();
  // ONE RESOLUTION FOR THE WHOLE CALL, so the message below quotes the number
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
          /* Anthropic calls it `stop_reason`; a clean finish is `end_turn`. */
          finishReason: response.stop_reason ?? null,
          /* Anthropic does not report a separate reasoning count on this path. */
          reasoningTokens: 0,
        },
        ms: Date.now() - started,
      };
    }

    // OPENAI-COMPATIBLE. Raw fetch rather than a vendor SDK: this endpoint shape
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_completion_tokens: maxOutputTokens,
        // REASONING EFFORT — the fix for the AI pass "failing" (WS-4).
        ...(isReasoningModel(cfg.model)
          ? {
              // The literal fallback is not redundant — same reason the model id
              reasoning_effort: env.RESUME_PARSER_REASONING_EFFORT || "low",
            }
          : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: schemaName,
            strict,
            schema,
          },
        },
      }),
      // A DEADLINE, so a slow call fails as a sentence rather than as a dead
      signal: AbortSignal.timeout(budgetMs),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        reason: "error",
        /* `E519` — redacted: the body can quote the key (see `redactSecrets`). */
        message: redactSecrets(`The model endpoint returned ${res.status}. ${body.slice(0, 300)}`),
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
      // WHOSE FAULT WAS THE TRUNCATION (WS-4).
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
    // A REFUSAL IS NOT AN EMPTY RESPONSE WS-2)
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
        // what a model that SUMMARISED reports. See `ModelUsage`.
        finishReason: choice?.finish_reason ?? null,
        reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens ?? 0,
      },
      ms: Date.now() - started,
    };
  } catch (e) {
    console.error("[resume] model call failed:", e);
    // message is "The operation was aborted due to timeout" — accurate, and
    if (e instanceof Error && e.name === "TimeoutError") {
      return {
        ok: false,
        // deleted : `reason: "error",`. The clock stopped this call, not
        reason: "deadline",
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
