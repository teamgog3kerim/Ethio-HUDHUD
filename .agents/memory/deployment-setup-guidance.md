---
name: Deployment setup guidance
description: Prevent placeholder credentials from being mistaken for a deployable environment file.
---

Provide directly importable public settings separately from the list of credentials that must be obtained and entered privately. Do not present a complete-looking placeholder-filled environment file as an easy deployment fix.

**Why:** During external-host setup, the owner imported the supplied template unchanged. Different replacement labels for the two copies of the same Clerk publishable key also produced a misleading mismatch error.

**How to apply:** Diagnose remaining placeholders before repeating deployment instructions. Explain where real credentials must come from without requesting their values in chat, weakening authentication checks, or claiming that importing variable names makes the deployment ready.
