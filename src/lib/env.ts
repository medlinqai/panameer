import { z } from "zod";

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

  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_RESUME_MODEL: z.string().min(1).default("claude-sonnet-5"),

  RESUME_PARSER_PROVIDER: z.enum(["openai", "anthropic"]).optional(),
  RESUME_PARSER_API_KEY: z.string().min(1).optional(),
  RESUME_PARSER_MODEL: z.string().min(1).optional(),
  RESUME_PARSER_BASE_URL: z.string().min(1).optional(),
  RESUME_PARSER_REASONING_EFFORT: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.enum(["minimal", "low", "medium", "high"]).default("low")
  ),
  RESUME_PARSER_PRICE_IN_PER_M: z.coerce.number().nonnegative().optional(),
  RESUME_PARSER_PRICE_OUT_PER_M: z.coerce.number().nonnegative().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),

  // OAuth (brief_Q) — all optional; a provider's button is live only when both
  // of its vars are present, so absent creds simply disable it.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  APPLE_CLIENT_ID: z.string().min(1).optional(),
  APPLE_CLIENT_SECRET: z.string().min(1).optional(),

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
