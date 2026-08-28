# SurpTees Landing Page

SurpTees landing page with a server-created Stripe Checkout Session for a single $4 random one-off purchase.

Usage
- Install dependencies with `npm install`.
- Copy `.env.example` to `.env`, then replace the placeholders with your local Stripe values.
- Start the server with `npm start`.
- Open `http://localhost:4242` and start checkout.

Cloudflare's local development tooling can load `.env` for local variables. Keep `.env` private; it is ignored by Git. Use `npx wrangler secret put STRIPE_SECRET_KEY` for the deployed Worker instead of committing or uploading the local file.

Cloudflare Workers deployment
- The Worker entry point is `worker.js`; static files are in `public/`.
- Add the production Stripe key as a Cloudflare secret: `npx wrangler secret put STRIPE_SECRET_KEY`.
- Preview locally with `npm run dev`.
- Verify the bundle with `npx wrangler deploy --dry-run`.
- Deploy with `npm run deploy`.
- Connect the Worker to the custom domain after deployment. Do not add the Stripe secret to `wrangler.jsonc` or commit `.env`.

The browser posts `tier` (always `4`) and the required customer-selected `quantity` (1-10) to `/api/create-checkout-session`. The server validates both values, maps the tier to the live one-time $4 Price from the `surptees.com` Stripe account, applies the quantity to the Checkout line item, creates a Checkout Session, and redirects to Stripe-hosted Checkout. The Stripe Product and Price do not need to change. Do not commit `.env` or secret keys.

Before production, add a verified Stripe webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded` to record orders and trigger fulfillment.
