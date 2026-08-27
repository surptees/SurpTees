# SurpTees Landing Page

SurpTees landing page with a server-created Stripe Checkout Session for a single $4 random one-off purchase.

## Production architecture

- Cloudflare Pages serves the static storefront from `public/`.
- The `surptees-checkout-api` Worker handles only `/api/create-checkout-session`.
- Pages owns the `surptees.com` and `www.surptees.com` custom domains.
- The Worker has no static asset binding or custom domain. Its routes are limited to `/api/*` on those hostnames.

## Local usage

- Install dependencies with `npm install`.
- Copy `.env.example` to `.env`, then replace the placeholders with your local Stripe values.
- Start the server with `npm start`.
- Open `http://localhost:4242` and start checkout.

Cloudflare's local development tooling can load `.env` for local variables. Keep `.env` private; it is ignored by Git. Use `npx wrangler secret put STRIPE_SECRET_KEY` for the deployed Worker instead of committing or uploading the local file.

## Cloudflare Pages deployment

Create or update the Pages project with these settings:

```text
Production branch: master
Root directory: /
Build command: leave empty
Output directory: public
```

Add `surptees.com` and `www.surptees.com` under the Pages project's **Custom domains**. Do not attach either hostname as a Worker Custom Domain.

## Checkout Worker deployment

The API Worker entry point is `worker.js`. It deliberately has no `assets` configuration and never calls an `ASSETS` binding.

1. Verify the API-only bundle:

   ```bash
   npx wrangler deploy --dry-run
   ```

2. Deploy the Worker:

   ```bash
   npm run deploy
   ```

3. Store the production restricted Stripe key on the renamed Worker:

   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   ```

   The command uses the `surptees-checkout-api` name in `wrangler.jsonc`. Do not put the key in source code, `wrangler.jsonc`, Pages variables, or a committed environment file.

The Worker routes are declared in `wrangler.jsonc`:

```text
surptees.com/api/*
www.surptees.com/api/*
```

To verify them in the Dashboard, open **Workers & Pages > surptees-checkout-api > Settings > Domains & Routes**. Keep only those two API routes. Remove any Worker Custom Domain or wildcard route such as `surptees.com/*` or `www.surptees.com/*`, because those would intercept storefront requests that belong to Pages.

If Cloudflare Builds is connected to GitHub, connect the Pages project and `surptees-checkout-api` Worker as separate deployments from the same repository. A push to `master` can then redeploy both without combining their routing responsibilities.

## Checkout behavior

The browser posts only `tier` (always `4`) to `/api/create-checkout-session`. The server maps the tier to the live one-time $4 Price from the `surptees.com` Stripe account, creates a Checkout Session, and redirects to Stripe-hosted Checkout. Do not commit `.env` or secret keys.

Before production, add a verified Stripe webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded` to record orders and trigger fulfillment.
