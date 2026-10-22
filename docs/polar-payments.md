# Polar payment integration

## Current boundary

Only the development sandbox is enabled. Sandbox purchases have their own
records and customer IDs and **never grant real paid access**, modify admin
grants, or change learning progress. Live billing and paywalls remain disabled.
The sandbox adapter is hard-coded to Polar's sandbox environment and refuses to
operate when `NODE_ENV=production`.

## Development configuration

Server-only secrets, entered with secure secret tooling:

- `POLAR_SANDBOX_ACCESS_TOKEN`
- `POLAR_SANDBOX_WEBHOOK_SECRET`

Non-secret development settings:

- `POLAR_SANDBOX_CHECKOUT_ENABLED=true`
- `POLAR_SANDBOX_MONTHLY_PRODUCT_ID`: fixed USD 29, recurring each month
- `POLAR_SANDBOX_SIX_MONTH_PRODUCT_ID`: fixed USD 149, **one-time**
- `POLAR_SANDBOX_APP_URL`: the development HTTPS origin, no path

Never put tokens in `VITE_*`, client bundles, source files, URLs, chat, or logs.
Production needs independent products, tokens, endpoint, and an explicitly
approved live adapter and access-enforcement rollout. Do not merely rename a
sandbox secret or point this adapter at a production host.

## Merchant webhook setup

In the **sandbox** organization, Settings → Webhooks:

1. Add an endpoint at
   `<POLAR_SANDBOX_APP_URL>/api/billing/polar/sandbox/webhook`.
2. Select **Raw** JSON delivery.
3. Select `checkout.updated`, `checkout.expired`, `order.paid`, `order.updated`,
   `order.refunded`, `subscription.updated`, `subscription.canceled`, and
   `subscription.revoked`.
4. Save its signing secret securely as `POLAR_SANDBOX_WEBHOOK_SECRET`.
5. Restart the managed API workflow after saving it.
6. Send/retry a sandbox event and confirm HTTP 202 in Polar's delivery view.

The development server must be running and its URL publicly reachable. Workspace
access protection can prevent external delivery. If so, don't disable account
security: use an approved reachable test deployment and configure its sandbox
adapter separately. A 503 before the secret is supplied is expected; no unsigned
event is accepted.

Development verification completed: a genuine Polar `subscription.updated`
notification returned HTTP 202 and produced a persisted receipt after
reconciliation. Unsigned requests returned HTTP 403. The notification was
triggered by a metadata-only update to an isolated sandbox test subscription;
its price and cancellation settings were unchanged. Other event types,
redelivery and refund scenarios still need dedicated coverage.

The official versioned Polar SDK verifies raw request bytes, signed IDs and
timestamps. It supports both current Standard Webhooks secrets and older Polar
signing keys. Do not reimplement one scheme based on an outdated sample.

## User-facing test flow

- Sign in using a verified email.
- `/choose-plan?plan=monthly` or `/choose-plan?plan=six_month`
- Explicitly choose **Start sandbox checkout (no charge)**.
- Use **only sandbox** test payment data.
- Return to `/billing/return?checkout_id=...` for a server verification.
- An arbitrary success parameter or checkout ID cannot unlock access.
- The sandbox portal lets the same customer manage test billing.

Signed-in requests are account-bound, creation is serialized, and a pending
same-plan session is reused. Another pending plan is rejected until it expires;
verified unexpired purchases cannot be purchased again. Deleted identities are
not recreated from webhook events.

The application reads current Polar state, rather than trusting redirect
parameters or the status inside a potentially delayed event. Processed webhook
IDs are stored only after reconciliation succeeds. Sandbox records survive
learning resets; they're not learner progress.

## Before a real launch

- Independently verify live products and merchant payout readiness.
- Obtain approved cancellation, refund, failed-payment grace-period and
  existing-pilot-user transition policies.
- Implement and test live payment records and API-side access enforcement.
- Guarantee monthly billing ends after six paid periods, including retries,
  webhook outages, refunds, and portal changes. Sandbox currently schedules
  cancellation when verification observes six paid orders; this alone is not
  a production-grade guarantee against a seventh charge.
- Reconcile provider state after missed events using a durable scheduled worker.
- Connect verified billing dates to the four-day reminder system.
- Test payment success, failure, refunds, cancellation, expiry, cross-account
  denial, and installed-mobile-app return navigation.
- Publish only with the user's approval; a live test purchase also needs approval.

Do not mark the payment gateway complete or enable live charges on the strength
of sandbox checks alone.
