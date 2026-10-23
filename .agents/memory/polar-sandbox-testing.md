---
name: Polar sandbox testing
description: Sandbox identity constraints, signing compatibility, and SDK resource-validation limits for sandbox and live webhooks.
---

Polar sandbox rejects checkout email addresses whose domain does not accept mail,
including reserved example domains. A sandbox token and valid product do not
prove checkout creation will work with an arbitrary test identity.

**Why:** A real browser checkout failed before navigation because Polar rejected
the test learner's example-domain email, not because of token permissions.

**How to apply:** Use isolated Clerk test identities with the documented testing
mechanism and a mail-capable domain format. Keep purchases in Polar sandbox and
do not substitute an existing learner's or owner's email to make a test pass.
Confirm the current sandbox email-delivery restrictions before using synthetic
addresses.

Use the official versioned Polar SDK for webhook validation rather than a
handwritten HMAC example.

**Why:** Polar documents a signing change on 2026-09-08: new secrets use Standard
Webhooks, older ones use a different key derivation. Current SDKs support both.

**How to apply:** Verify the raw request body before JSON parsing or account
middleware. Follow the installed SDK's versioned API, not older camelCase
examples, and never print payloads, bearer tokens, or complete checkout URLs.

Validate resource fields after the SDK verifies a webhook; SDK TypeScript types
are not proof that the received resource matches that type.

**Why:** Inspection of the installed versioned SDK showed that webhook validation
checks the signature, timestamp, JSON parsing, and recognized event type, then
returns the parsed object without validating its resource fields.

**How to apply:** Check required identifiers and relevant resource fields before
storing or reconciling either live or sandbox events. A signed event proves
origin, not account ownership, current payment status, or paid access.

Do not direct the owner to a presumed dashboard “Test delivery” button.

**Why:** The owner’s Deliveries screenshots showed a search input, which was
mistaken for a button twice. Polar’s documented sample-event workflow instead
uses `polar webhook trigger` through a running CLI listener.

**How to apply:** Distinguish delivery filters from actions. CLI samples use the
listener’s signing secret and do not prove delivery through the registered
production endpoint. Keep CLI testing isolated; do not replace a live signing
secret just to run a sample, or ask for a real purchase to test receipt intake.
