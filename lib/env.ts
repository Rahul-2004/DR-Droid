import { z } from "zod";

const encryptionKey = z.string().transform((value, context) => {
  try {
    const decoded = Buffer.from(value, "base64");
    if (decoded.length !== 32 || decoded.toString("base64") !== value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "ENCRYPTION_KEY must be a base64-encoded 32-byte key" });
      return z.NEVER;
    }
    return value;
  } catch {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "ENCRYPTION_KEY must be valid base64" });
    return z.NEVER;
  }
});

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_test_", "MicroManus is configured for Stripe test mode only"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_CREDIT_PRICE_ID: z.string().startsWith("price_"),
  ENCRYPTION_KEY: encryptionKey,
  TAVILY_API_KEY: z.string().min(1),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(30),
});

export const env = () => schema.parse(process.env);
