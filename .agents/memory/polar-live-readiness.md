---
name: Polar live readiness
description: Distinguish app checkout activation from Polar payment readiness, and verify safely without real-card test purchases.
---

An app-enabled live checkout, a successfully created Polar session, and processed
signed webhooks do not prove that Polar will allow the buyer to pay.

**Why:** A live checkout accepted updates and sent valid webhooks while its Pay
button displayed “Payments are currently unavailable.” Polar's own checkout
disables payment when the organization's payment readiness is false.

**How to apply:** Check the organization attached to the actual live product,
not merely the merchant's payout setup or a different organization. Polar's
checkout uses the public GET /v1/organizations/{id}/payment-status endpoint;
inspect payment_ready and organization_status. The ordinary authenticated
organization-details endpoint can return 403 when the integration token lacks
organizations:read; do not ask for broader credentials just to read the public
readiness result. Do not call the live flow payment-ready based only on app flags.

Do not instruct the owner to make a real-card test purchase.

**Why:** Polar's account-review documentation explicitly warns that real-card
test transactions can be flagged as card testing and block accounts or cards.
Source: https://polar.sh/docs/merchant-of-record/account-reviews#test-transactions

**How to apply:** Use the separate sandbox for paid-entitlement tests. Polar
also documents free products or 100% discounts for production checks, but do
not weaken the app's full-price entitlement verification or grant six-month
paid access to such fixtures. Distinguish a genuine buyer's intended purchase
from a merchant's test transaction.

A checkout ID is not proof that a Polar customer exists or that the billing
portal is available. Offer receipts/portal access from verified purchase history,
including expired or refunded purchases, not from an abandoned checkout.

**Why:** Production portal calls returned Polar validation errors for an unpaid
checkout; its provider response had no customer ID. The old eligibility check
treated any checkout as a purchase.

**How to apply:** Preserve resume/status actions for unfinished checkouts. For
portal sessions, re-check the original checkout's account and product ownership
and use its actual Polar customer ID. Never create another checkout or grant
learning access just to make a portal link work.
