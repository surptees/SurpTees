# SurpTees Landing Page

SurpTees landing page with a server-created Stripe Checkout Session. The tee stays a surprise while customers choose a price tier and size.

Usage
- Install dependencies with `npm install`.
- Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY` for the live `surptees.com` account.
- Start the server with `npm start`.
- Open `http://localhost:4242` and choose a tier and size.

The browser posts only `tier` and `size` to `/api/create-checkout-session`. The server maps each tier to the existing one-time Price from the live `surptees.com` Stripe account, creates a Checkout Session, and redirects to Stripe-hosted Checkout. Do not commit `.env` or secret keys.

Before production, add a verified Stripe webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded` to record orders and trigger fulfillment.
