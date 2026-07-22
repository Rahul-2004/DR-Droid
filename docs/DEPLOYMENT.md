# Production deployment

## Vercel

1. Apply Prisma migrations using the production `DIRECT_URL`.
2. Configure every variable from `.env.example` in Vercel Production settings.
3. Deploy and set `NEXT_PUBLIC_APP_URL` to the exact HTTPS production origin.
4. Add `<origin>/api/auth/callback` to the Supabase redirect allow-list.
5. Create a Stripe test webhook for `<origin>/api/webhooks/stripe` with:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
6. Replace `STRIPE_WEBHOOK_SECRET` with that endpoint's signing secret and redeploy.

## Release verification

- Google login returns to `/app`.
- A zero-credit user cannot dismiss the paywall.
- The invitation coupon grants five credits once.
- Stripe test card `4242 4242 4242 4242` grants five credits once.
- Adding a user-owned provider key enables research and a follow-up retains thread context.
- `@report` returns a PDF download card.
- Analytics reflects model, token categories, credits, cache savings, and cost.

Rotate any credential that has appeared in terminal history, chat, screenshots, or Git history before publishing.
