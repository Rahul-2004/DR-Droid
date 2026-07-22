import { env } from "@/lib/env";
import { db } from "@/lib/db";

type RateLimitRow = { count: number; resetAt: Date };

export async function rateLimit(id: string) {
  const max = env().RATE_LIMIT_MAX_REQUESTS;
  const rows = await db.$queryRaw<RateLimitRow[]>`
    INSERT INTO "ApiRateLimit" ("key", "count", "resetAt", "updatedAt")
    VALUES (${id}, 1, NOW() + INTERVAL '1 minute', NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "ApiRateLimit"."resetAt" <= NOW() THEN 1 ELSE "ApiRateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "ApiRateLimit"."resetAt" <= NOW() THEN NOW() + INTERVAL '1 minute' ELSE "ApiRateLimit"."resetAt" END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt"
  `;
  const row = rows[0];
  return {
    allowed: row.count <= max,
    retryAfter: Math.max(1, Math.ceil((row.resetAt.getTime() - Date.now()) / 1000)),
  };
}
