---
name: Favourite identity boundaries
description: Why guest favourites remain separate from signed-in account favourites.
---

Keep guest favourites separate from account favourites; do not silently merge
them when someone signs in on a shared browser.

**Why:** Saving across devices must use the existing account identity without
importing another person's guest activity or changing existing sign-in behavior.
Guest saves are intentionally limited to their existing session.

**How to apply:** If adding guest-to-account transfer later, make it an explicit
learner choice and verify ownership on the server rather than accepting learner
identifiers from the client.

Keep account-isolation regression checks in the same mounted browser/query
client, and delay the incoming identity's response when checking visible data.

**Why:** A full navigation/reload discards stale observers and can make a leaking
account-switch implementation appear safe. Checking only the final response
also misses private data left visible during the next learner's loading state.

**How to apply:** Exercise guest/account transitions, sign-out, direct account
switching and saved detail controls without rebuilding the client between
identities. Keep SDK identity simulation test-only; it is not proof of real
authentication or backend ownership enforcement.
