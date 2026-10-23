# Polar payment integration

## Current boundary

The owner approved **live $149 one-time checkout only** for the next published
build. Monthly checkout and expired-trial blocking remain disabled. Learning
temporarily stays open and purchasing is optional; a real charge occurs only
when a customer completes Polar checkout. Do not make a purchase automatically.

Sandbox purchases have their own
records and customer IDs and **never grant real paid access**, modify admin
grants, or change learning progress.
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

The staged receiver was published by the owner and an unsigned production probe
returned HTTP 403. That verifies reachability/rejection, not a Polar-signed
delivery or a real purchase.

The staged live checkout adapter, customer portal, reconciliation worker and paid
access resolver are now implemented. They use separate live purchase records,
`hudhud-live:` customer identities and current provider reads; neither a plan
preference, success redirect, nor sandbox purchase grants paid access.
`LIVE_CHECKOUT_LAUNCH_APPROVED` and `BILLING_CONFIGURED` are now true with explicit
owner approval. `LIVE_MONTHLY_CAP_APPROVED` and `TRIAL_ENFORCEMENT_ENABLED` remain
false. Runtime checkout also requires the live token and webhook secret. A
monthly request is rejected before any provider call. No real purchase has
been performed or authorized for the agent.

Checkout creates a durable intent before calling Polar. Ambiguous timeouts stay
unresolved instead of being blindly retried; the worker can recover the
account-bound intent from checkout metadata. An existing active subscription or
unresolved purchase blocks another checkout. Only verified primary email is
forwarded, never a browser-supplied customer ID, price, or return origin.

The worker retries durable receipts and polls purchases independently of event
delivery. It starts on service startup and ticks while the process runs; this is
not an always-on scheduler on an idle autoscale deployment. Paid access older
than five minutes is rechecked on demand and fails closed if verification is
unavailable. No receipt is marked processed until reconciliation succeeds.
Deleted/suspended accounts cannot gain access from callbacks.

Live return URLs explicitly select `environment=live`; old sandbox return URLs
remain sandbox-only. The learner can see pending verification, paid access,
expiry, renewal cancellation and billing-portal access. A cancellation return
does not prove there was no charge. Existing paid access feeds AI quota selection
and verified renewal dates without overwriting complimentary grants or progress.

The configured return origin is the verified public domain
`https://ethiohudhud.com`. If the production domain changes, update the adapter
and Polar endpoint settings together.

### Provider readiness is separate from app activation

An enabled app checkout flag and successfully processed checkout webhooks do
not prove that Polar will accept payment. A checkout displaying “Payments are
currently unavailable” was traced to the live product's organization's public
payment-status response: `organization_status: created`, `payment_ready: false`.
The owner subsequently completed the review. A fresh live check confirmed
`organization_status: active` and `payment_ready: true`; this provider block
is now resolved. Payout setup by itself was not proof of payment activation.
Recheck readiness before describing purchases as available to customers.
This readiness confirmation is not a completed-payment entitlement test.

Polar's own checkout reads GET /v1/organizations/{id}/payment-status. This public
read does not require adding organizations:read to the existing token.
Do not test with real cards: Polar directs integration testing to sandbox, or
free/100%-discount production checks. Such free checks must not bypass this
app's full-price paid-entitlement policy. A genuine customer's completed
purchase remains distinct from a merchant test.

The configured $29 live product is an ongoing monthly recurring product. Before
enabling it, resolve a reliable six-payment billing cap; canceling only when a
webhook happens to observe six orders is insufficient. Do not silently replace
automatic subscriptions with manual renewals or allow indefinite charges.

The owner has now explicitly approved a replacement monthly offering: $29 for
one month, renewed manually, up to six monthly payments. Implement and enable
that option after testing while retaining the $149 option and keeping trial
blocking off. This requires a separate live **one-time** $29 USD product. The
current live integration can read products, but Polar rejected product creation
with HTTP 403; the owner needs to create this product in the dashboard and
provide its Product ID. No manual product was created or connected by that
failed request. Do not reuse or activate the original recurring product.

The owner chose to finalize the **$149 one-time, six-month plan first** and keep
monthly checkout disabled. A read-only live product check confirmed that its
product is active, non-recurring and has one active fixed USD 14900-cent price.
Both live secrets are present in production configuration. The public checkout
route still returned HTTP 404 when checked after this scope choice, so the
published build does not yet expose the new checkout flow. Publish the prepared
implementation and verify it before claiming the public payment flow is ready.
The owner subsequently explicitly approved enabling $149 checkout in the next
published build while keeping monthly checkout and trial blocking off. This
does not authorize an automatic purchase or publication. After publishing,
verify the public route and verify a genuine provider-signed delivery; simulated
test responses are not proof of a completed live payment round trip.

## Approved live-access rules — staged implementation

- Monthly cancellation stops renewal; access lasts through the paid period.
- Failed monthly renewals receive three days' grace before paid lessons lock.
- Refund approval is manual in Polar. A full refund removes its associated paid
  access; a partial refund leaves access unchanged.
- Learning progress and original trial dates are preserved.

Automated checks use isolated local fixtures and mocked policy inputs, never a
real live purchase. A real provider-signed delivery and payment round trip still
need verification before an explicitly approved rollout. Do not replace the
live webhook secret with a CLI listener secret or assume the dashboard delivery
search field is a test button.

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
