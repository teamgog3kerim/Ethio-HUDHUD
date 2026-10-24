# Unpaid checkout switching

The installed `@polar-sh/sdk` 1.0.2, versioned API `2026-10`, exposes
`checkouts.list`, `create`, `get`, `update` and client checkout methods.
There is no expire, delete, cancel or retire method. `CheckoutUpdate` has
neither a writable status nor `expires_at`; the latter is a response field.
Changing a product inside a session is not retirement and is not used here:
it would change the meaning of an existing link and its original purchase intent.

Sources checked:
- Installed SDK `dist/2026-10/services/checkouts.d.mts`
- Installed SDK `dist/models-P8aaHkKR.d.mts`, `CheckoutUpdate`
- https://polar.sh/docs/api-reference/checkouts/update-checkout-session
  (redirects to the versioned API introduction)
- https://polar.sh/docs/integrate/cli/reference/checkouts.md
  (documents read methods and statuses, not retirement)

Therefore immediate switching is intentionally unavailable. Resume verifies
the account-owned original ID using GET, without creating anything. Switching
is possible only after a current provider read reports the original terminal
status and reconciles its orders. Passing the expiry timestamp alone is not
proof that a checkout cannot charge. Network errors, ambiguous creation and
unresolved payments keep the block. Never mark a row expired locally to permit
a replacement.

Account-scoped database advisory locks serialize purchase intent insertion
and reconciliation, including requests from different tabs/processes.
The provider call that creates a session occurs only after the durable
`creating` intent has reserved the account. Verification of orders, access,
refunds and immutable monthly payment proof remains in the existing reconciler.
No provider mutations or purchases are needed to test switching.
