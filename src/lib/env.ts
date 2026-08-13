import { z } from "zod";

/**
 * Centralised, validated environment access.
 *
 * Validation is non-fatal: in development you get a clear console warning for a
 * missing/invalid var, but the process never hard-crashes a build. Import `env`
 * anywhere instead of reaching into `process.env` directly.
 */
const schema = z.object({
  // Database (Supabase Postgres, via Prisma + pg adapter)
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().min(1).default("http://localhost:3100"),

  // Supabase (storage / server APIs — auth is NextAuth, not Supabase)
  SUPABASE_URL: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  /*
    Anthropic — the résumé AI extractor (brief_resume_parser_ai WS2).

    OPTIONAL, and the whole tier is designed around it being absent: no key means
    the AI pass simply isn't offered and the heuristic result stands. The model id
    is configurable so it can be swapped without a deploy of code.

    SERVER ONLY. No `NEXT_PUBLIC_` prefix, so Next will not bundle it into client
    code — a résumé-extraction key in the browser would be a key anyone can spend.
  */
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_RESUME_MODEL: z.string().min(1).default("claude-sonnet-5"),

  /*
    THE RÉSUMÉ PARSER, vendor-neutral (brief_j14 WS-A).

    Parsing is commodity extraction and was running on a frontier model. These
    vars move the model, the key and its PRICES out of the code so an economy
    tier can be swapped in — and A/B'd — without a deploy.

    RESUME_PARSER_PROVIDER  "openai" (any OpenAI-compatible endpoint, incl.
                            Gemini's compat layer) or "anthropic".
    RESUME_PARSER_MODEL     the model id. No default: guessing one produces a
                            confident 404 at the worst moment.
    RESUME_PARSER_BASE_URL  for OpenAI-compatible providers that aren't OpenAI.
    RESUME_PARSER_PRICE_*   USD per MILLION tokens, so $/parse is computed from
                            real usage rather than a number hardcoded here that
                            silently goes stale when a vendor reprices.
    RESUME_PARSER_REASONING_EFFORT
                            "minimal" | "low" | "medium" | "high", default LOW.
                            Only sent to reasoning models. See ai-provider.ts —
                            leaving this at the vendor default is what broke the
                            AI pass, so the default here is deliberate, not a
                            convenience.

    Absent → the parser falls back to the Anthropic path, which is what runs
    today. No key anywhere → no AI tier at all, as before.
  */
  RESUME_PARSER_PROVIDER: z.enum(["openai", "anthropic"]).optional(),
  RESUME_PARSER_API_KEY: z.string().min(1).optional(),
  RESUME_PARSER_MODEL: z.string().min(1).optional(),
  RESUME_PARSER_BASE_URL: z.string().min(1).optional(),
  /*
    PREPROCESSED so an empty string means "unset" rather than "invalid".

    `.env.example` ships every key with `=""`, and one failing key takes the
    WHOLE schema down to raw process.env below — which silently discards every
    default in this file, including this one. A var whose only job is to hold a
    default must not be the var that destroys them all.
  */
  RESUME_PARSER_REASONING_EFFORT: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.enum(["minimal", "low", "medium", "high"]).default("low")
  ),
  RESUME_PARSER_PRICE_IN_PER_M: z.coerce.number().nonnegative().optional(),
  RESUME_PARSER_PRICE_OUT_PER_M: z.coerce.number().nonnegative().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),

  // OAuth (brief_Q) — all optional; a provider's button is live only when both
  // of its vars are present, so absent creds simply disable it.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  APPLE_CLIENT_ID: z.string().min(1).optional(),
  APPLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Company-logo suggestion (brief_U / E043) — all optional; unset falls back
  // to the keyless Wikidata lookup.
  LOGODEV_TOKEN: z.string().min(1).optional(),
  LOGODEV_SECRET_KEY: z.string().min(1).optional(),
  BRANDFETCH_API_KEY: z.string().min(1).optional(),

  // SMS (Twilio) — optional; unset falls back to logging the code (brief_P).
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_FROM_NUMBER: z.string().min(1).optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().min(1).default("http://localhost:3100"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV !== "production") {
  console.warn(
    "⚠️  Invalid or missing environment variables:\n",
    parsed.error.flatten().fieldErrors,
    "\n   Copy .env.example to .env.local and fill in the values.\n"
  );
}

export const env = (
  parsed.success ? parsed.data : (process.env as unknown)
) as z.infer<typeof schema>;
