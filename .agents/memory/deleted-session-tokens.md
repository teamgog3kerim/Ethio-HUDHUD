---
name: Deleted identity session tokens
description: Preventing data recreation by old Clerk JWTs after account deletion.
---

Retain a minimal deleted-identity tombstone and reject it before resolving any
learner data, even after successfully deleting the Clerk identity.

**Why:** During development verification, browser requests with an already-minted
session JWT remained accepted immediately after provider-side identity deletion
and recreated a deleted learning profile. Identity deletion alone is not an
immediate application-level authorization barrier.

**How to apply:** Check deleted/suspended account state before every learner or
administrator route. Preserve the deletion barrier across self-service data resets
and restarts. Exclude deleted identities from active/suspended-user statistics.
