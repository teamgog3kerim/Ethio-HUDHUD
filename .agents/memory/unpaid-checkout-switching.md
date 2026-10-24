---
name: Unpaid checkout switching
description: Safety constraint for changing plans while an earlier checkout can still charge.
---

Do not offer immediate plan switching unless Polar can confirm the original
checkout is no longer payable. Waiting is intentional when safe retirement
is unavailable; local expiry or abandonment is not sufficient.

**Why:** The same learner can reopen an old checkout URL in another tab.
Creating a replacement based only on local state risks two charges, and
changing the product behind an existing link changes what that learner
believes they are paying for.

**How to apply:** Keep resume verification-only, tied to the original checkout,
even if the learner selected a different plan. Revisit provider retirement
support when upgrading the billing API, without weakening the safety block
to make switching appear faster.
