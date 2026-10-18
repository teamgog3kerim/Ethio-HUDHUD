# Administration

The website is the primary distribution surface, including home-screen installation
for learners and administrators. The same protected `/admin` panel works in mobile
browsers and the installed web app.

## Initial owner

Set the server-side `ADMIN_BOOTSTRAP_EMAIL` through workspace environment settings.
The owner must register/sign in with that email and complete Clerk email verification.
No shared password or client-side email allowlist is used.

The server resolves the verified owner separately in each Clerk tenant. Development
and published users have different IDs. Bootstrap is idempotent per tenant/email:
an initialization marker prevents a later restart from undoing a revoked privilege.
Do not delete that marker as a troubleshooting shortcut. Startup logs only the setup
status, never the configured address. A retry is also available on `/api/admin/me`
and with `pnpm --filter @workspace/api-server run bootstrap-owner`.

After publication, the owner signs in on the published domain, verifies the address,
and opens `/admin`. A successful development check is not proof of production access.
If the account does not yet exist, setup safely waits for its registration.

## Capabilities

- **Users:** real Clerk directory, search, pagination, display-name/daily-goal editing,
  suspension/restore and owner-only administrator assignment/removal.
- **Account deletion:** requires the target email plus a reason. Deletes the Clerk
  identity and learning records. It is not reversible through the UI. The owner
  and destructive self-actions are protected; audit records and minimal deletion
  tombstones remain. Old session tokens cannot recreate a deleted user's data.
- **Complimentary access:** explicit administrator grant, reason and expiry within
  366 days; revocable and automatically expires. It changes the AI request allowance.
  It is **not** a payment, subscription purchase, invoice or Polar transaction.
- **Settings:** learning submission pause, AI pause, free/complimentary AI limits,
  default daily goal for new profiles, Arabic/English announcement, support email.
  Existing profiles retain their chosen goals. Pausing learning blocks exercise and
  review submissions; it does not remove read-only access to previous learning data.
- **Content:** validated lesson JSON plus separate answer keys, creation, editing,
  ordering and archive. Archiving the last active lesson in a course is rejected.
  Every edit resets the record to pilot; the editor cannot certify qualified review.
- **Audit:** latest 100 administrator actions. Reasons are required for user/access/
  content changes. Settings record before/after values.

All administrator routes enforce server-side identity and current role; guests receive
401 and ordinary users 403. Suspensions and roles survive learner self-service data
deletion. Admins cannot change another administrator or the owner; only the owner can.

## Billing limitation

Polar is not configured. Checkout, paid subscriptions, provider cancellations and
refunds are unavailable. The panel cannot honestly report or modify subscriptions
that do not yet exist. Billing status clearly distinguishes free and complimentary
access, and subscription controls remain disabled until a real provider is connected.

## Development verification

`src/scripts/admin-fixtures.ts` creates disposable accounts only when the Clerk key is
a development key and `NODE_ENV` is not production. It uses no shared password.
Fixture IDs/emails are written to `/tmp/hudhud-admin-fixtures.json`, not committed.
After verification run `src/scripts/cleanup-admin-fixtures.ts` with `tsx` from the
API package. It verifies the fixture email pattern and ownership before removing
the disposable identities, app records and the archived verification lesson.
Minimal deletion tombstones remain to reject still-valid old session tokens.
