# Architecture

MicroManus is a Next.js App Router application with a server-owned data plane.

## Request flow

```text
Browser
  -> Supabase Google OAuth
  -> authenticated Next.js API route
  -> ownership and rate-limit checks
  -> atomic credit reservation
  -> iterative research agent
       -> selected user LLM provider
       -> Tavily search
       -> guarded webpage reader
       -> optional report artifact
  -> usage/cost persistence
  -> streamed status and answer chunks
```

## Boundaries

- `app/api`: authentication, validation, ownership, and HTTP response handling.
- `agent`: iterative orchestration, tools, result caching, and cost calculation.
- `providers`: protocol adapters and the verified model/pricing catalog.
- `lib`: database, encryption, credits, Stripe, rate limiting, and network safety.
- `features`: client workspace, paywall, provider settings, and analytics UX.
- `prisma`: normalized schema and ordered migrations.

## Consistency model

Coupon redemption, payment grants, research debits, and refunds share the credit ledger and use database transactions. Unique references make retried grants idempotent. A research credit is reserved before provider work and refunded when the run fails before persistence.

## Caching

Provider-reported cached tokens are stored separately from input/output/reasoning tokens. Identical non-report research requests use a user- and provider-scoped Postgres cache with expiration, allowing cache hits across serverless instances.
