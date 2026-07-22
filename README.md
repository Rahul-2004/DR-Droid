# MicroManus

**Live app:** https://micromanus-gilt.vercel.app

MicroManus is a bring-your-own-key deep-research SaaS. It combines Google social login, a five-credit paywall, Stripe test checkout, an iterative web research agent, persistent conversations, downloadable PDF reports, and token-level cost analytics.

[Architecture](docs/ARCHITECTURE.md) | [Deployment](docs/DEPLOYMENT.md) | [Contributing](CONTRIBUTING.md) | [Security](SECURITY.md)

## Included flow

- Google OAuth through Supabase Auth
- One-time `SID_DRDROID` coupon or a $5 Stripe test-card payment; either grants five credits
- Atomic, idempotent credit ledger with automatic failed-run refunds
- Encrypted OpenAI, Anthropic, Gemini, Kimi, and OpenAI-compatible credentials
- Current built-in model menus and automatic pricing for OpenAI, Anthropic, and Gemini
- Tavily search, guarded page reading, iterative tool execution, citations, and status streaming
- Thread-scoped context, new/rename/delete chat controls, and a selectable provider per chat
- `@report` / `create_report` PDF artifacts rendered as download cards in chat
- Persistent prompt-result caching plus provider cache-token accounting
- Input, output, cached, and reasoning token totals; tool calls; cost; cache savings; recent activity
- Persistent Postgres rate limiting and ownership checks on every user resource

Private chain-of-thought is never requested, stored, or displayed. Only tool actions, progress labels, and final answers are streamed.

## Local setup

1. Copy `.env.example` to `.env.local` and fill every value.
2. In Supabase Authentication, enable Google and paste Google’s client ID and secret. In Google Cloud, use:
   - JavaScript origin: `http://localhost:3000`
   - OAuth redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. In Supabase URL Configuration, use `http://localhost:3000` as Site URL and allow `http://localhost:3000/api/auth/callback`.
4. Install and prepare the database:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```

5. In Stripe test mode, create a one-time USD price of exactly $5.00. Set its `price_...` ID as `STRIPE_CREDIT_PRICE_ID`.
6. Forward the Stripe test webhook and copy its signing secret:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   Subscribe the deployed endpoint to `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
7. Add a Tavily API key. LLM keys are never preloaded; every user supplies their own in the UI.

## Required environment variables

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | Supabase transaction-mode pooler URL used at runtime |
| `DIRECT_URL` | Supabase session-mode URL used for migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon browser key |
| `NEXT_PUBLIC_APP_URL` | Exact app origin used for Stripe redirects |
| `STRIPE_SECRET_KEY` | Must be a Stripe `sk_test_...` key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this app’s webhook endpoint |
| `STRIPE_CREDIT_PRICE_ID` | Exactly $5 USD one-time Stripe Price |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte AES key; generate with `openssl rand -base64 32` |
| `TAVILY_API_KEY` | Server-side Tavily search key |
| `RATE_LIMIT_MAX_REQUESTS` | Per-user research requests per minute |

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:integration
npm run test:e2e
```

Use Stripe’s test card `4242 4242 4242 4242`, any future expiry, and any CVC. Verify that one completed session adds exactly five credits and that replaying the webhook does not add more.

## Vercel deployment

1. Push/import this folder into a Vercel project and choose Next.js.
2. Add every `.env.example` variable in Vercel. Use production Supabase URLs with `sslmode=require`, keep Stripe keys in test mode, and initially set `NEXT_PUBLIC_APP_URL` to the assigned `https://...vercel.app` origin.
3. Run `npx prisma migrate deploy` against the deployment database.
4. Add `https://YOUR_VERCEL_DOMAIN/api/auth/callback` to Supabase’s redirect allow-list. The Google redirect URI remains Supabase’s `/auth/v1/callback` URI.
5. Add `https://YOUR_VERCEL_DOMAIN/api/webhooks/stripe` as a Stripe test webhook and update `STRIPE_WEBHOOK_SECRET` in Vercel to that endpoint’s secret.
6. Redeploy after environment changes, then friend-test signup, coupon, test card checkout, key addition, normal research, follow-up context, `@report`, chat management, and analytics.

## Architecture

```text
app/api       authenticated HTTP routes and Stripe webhook
agent         iterative research, Tavily/read tools, cache, cost calculation
providers     provider adapters and verified model catalog
features      workspace, paywall, provider management UI
lib           auth, database, encryption, credits, rate limits, URL safety
prisma        normalized schema and migrations
supabase      optional RLS hardening for direct Supabase access
```

The server uses Prisma for application data. Supabase browser code is used only for authentication. Never expose database, Stripe, Tavily, encryption, or provider secrets in `NEXT_PUBLIC_` variables.
