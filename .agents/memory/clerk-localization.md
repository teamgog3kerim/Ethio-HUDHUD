---
name: Clerk Arabic localization gaps
description: Full Arabic Clerk localization can still fall back to English for some auth fields.
---

Check each authentication screen in Arabic rather than assuming the bundled
Arabic locale translates every field.

**Why:** The Arabic locale shipped with the current Clerk localization package
left password placeholders undefined, so Clerk rendered English in otherwise
Arabic forms. Sign-in and sign-up also use different placeholder keys.

**How to apply:** Retain the official locale for verification, recovery and errors,
then supply narrowly scoped overrides for observed gaps. Verify both sign-in and
create-account states whenever changing locale packages or auth presentation.
