---
name: Shared React contexts in production
description: Why context-owning dependencies must be deduplicated across workspace clients.
---

Deduplicate context-owning libraries such as React Query across the web app and
shared API client, not just React and React DOM. Verify the production build,
because development dependency prebundling can conceal duplicate contexts.

**Why:** pnpm resolved the same React Query version into distinct React peer
instances for the web app and shared library. The published app then crashed with
"No QueryClient set" even though its component tree had a provider.

**How to apply:** Preserve a single provider module in each browser bundle when
changing package versions or shared-client dependencies. Do not fix this by
adding nested providers or changing authentication secrets.
