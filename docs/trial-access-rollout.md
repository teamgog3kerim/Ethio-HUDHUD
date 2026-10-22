# Staged 48-hour trial restriction

The owner chose to prepare, not activate, this restriction while live Polar
payments are unavailable. Existing learners remain unblocked.

## Prepared behavior

- The original persisted server trial expires at exactly 48 hours, not midnight.
- Guest-to-account sign-up keeps the earlier trial clock.
- Once activated, expired learners without a valid entitlement receive a 403
  `COURSE_SUBSCRIPTION_REQUIRED` response for course content and practice.
- The web/PWA learning routes show the existing monthly ($29) and six-month
  ($149) plan cards instead of lesson, alphabet, review or conversation content.
- Account, billing, progress, exports and deletion remain available. No learning
  records are deleted. Admins and valid complimentary grants retain access.
- Choosing a plan is only a preference. Sandbox purchases never unlock access.

## Not an activation switch for an unfinished payment system

Both `BILLING_CONFIGURED` and `TRIAL_ENFORCEMENT_ENABLED` remain false.
The paid-entitlement input in billing status deliberately remains false until a
verified live entitlement resolver is implemented. Do not turn these flags on
alone: doing so would lock expired trials without a working paid unlock.

Before activation:

1. Complete Polar merchant approval/payout setup and agree the refund terms.
2. Implement live checkout and verified, idempotent webhook reconciliation.
3. Connect verified live paid access to the shared server access policy, including
   cancellation through the paid period, three-day failed-renewal grace, and the
   approved full/partial refund behavior.
4. Replace preference-only checkout controls with live checkout, then refresh
   access after verified payment. Retain original trial dates and progress.
5. Verify the expired-trial → checkout → confirmed payment → resumed learning
   journey in the web/PWA, plus companion-client messaging if distributed.
6. Obtain explicit rollout approval, enable both gates together, and publish.

Public plan metadata is not a payment or entitlement source. Content already
downloaded to a browser cannot be remotely erased; server access checks protect
new requests and submissions, and the web gate removes cached learning queries
when access is revoked.
