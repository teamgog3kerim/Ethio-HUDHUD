---
name: Polar sandbox testing
description: Sandbox payment identity constraints and webhook signing compatibility.
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
