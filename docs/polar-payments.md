# Polar payment integration

## Current boundary

Only the development sandbox is enabled. Sandbox purchases have their own
records and customer IDs and **never grant real paid access**, modify admin
grants, or change learning progress. Live billing and paywalls remain disabled.
The sandbox adapter is hard-coded to Polar's sandbox environment and refuses to
operate when `NODE_ENV=production`.

## Staged live webhook intake

The owner has saved `POLAR_LIVE_WEBHOOK_SECRET` through secure secret tooling.
`POST /api/billing/polar/live/webhook` now validates exact raw request bytes with
the official Polar SDK before durable insertion into a separate live receipt
queue. It runs before browser CSRF and Clerk sign-in middleware. It is not
protected by a learner login; its authentication is the webhook signature.

HTTP 202 means **receipt durably stored or duplicate acknowledged**, not payment
verified or access activated. Receipts retain routing identifiers and a hash,
not customer email, addresses, raw payloads, or credentials. Unrelated/sandbox
product IDs are ignored. Signed malformed resources fail validation; invalid,
stale, and future signatures are rejected. Conflicting reuse of a signed event
ID is rejected. A database failure is not acknowledged, allowing Polar retries.

There is not yet a live reconciliation worker, account-linked live checkout,
live customer portal, or paid-entitlement resolver. Pending receipts must not be
marked processed until provider state and account ownership are reconciled.
This staged receiver must be published before Polar delivery tests can succeed
against the public domain. No publication or real purchase has been performed.

The configured $29 live product is an ongoing monthly recurring product. Before
enabling it, resolve a reliable six-payment billing cap; canceling only when a
webhook happens to observe six orders is insufficient. Do not silently replace
automatic subscriptions with manual renewals or allow indefinite charges.

## Approved live-access rules — implementation still pending

- Monthly cancellation stops renewal; access lasts through the paid period.
- Failed monthly renewals receive three days' grace before paid lessons lock.
- Refund approval is manual in Polar. A full refund removes its associated paid
  access; a partial refund leaves access unchanged.
- Learning progress and original trial dates are preserved.

The merchant confirms live-payment approval and completed payout setup.
The customer refund policy supplied by the merchant is **no refunds**.
Customer-facing terms must preserve mandatory legal rights and Polar's buyer
terms; this does not eliminate handling for provider-approved refunds or
payment corrections. This policy still needs to be shown before live checkout.
Live activation remains blocked until implementation, verification, and explicit
rollout approval.
The sandbox currently fails closed on partial refunds; that is test behavior,
not the approved live partial-refund rule.

Both live products were verified using read-only requests: USD 29 recurring
monthly, and USD 149 one-time. No live checkout or charge was created.

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

- Confirm merchant approval and payout readiness; live product prices and billing
  types have already been verified with read-only requests.
- Obtain the customer refund window and eligibility terms, and approve the
  existing-pilot-user transition. Implement the approved access rules above.
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
