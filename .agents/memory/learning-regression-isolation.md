---
name: Learning regression isolation
description: Why learner regression tests split browser behavior from real persistence and how to keep their data isolated.
---

Keep repeatable learner regression tests independent of real account credentials.
Use in-memory API records for browser interactions and a separate real-router
persistence test scoped to a newly created random learner. Never modify shared
curriculum records or reuse a human learner for regression setup.

**Why:** The assigned regression work explicitly requires isolated records and no
changes to real learner data. Splitting the layers permits deterministic browser
reload/navigation tests without adding authentication bypasses to the application.

**How to apply:** Treat browser success as UI/contract evidence only; real grading
and one-time credit need the persistence layer too. Unexpected API calls must fail
closed rather than falling through to an actual learner session.

On Replit's NixOS environment, a downloaded Playwright browser may lack its Linux
shared libraries even when installation succeeds. Prefer the system's Nix-wrapped
Chromium; keep a pinned-browser fallback for other environments.

**Why:** The downloaded headless shell could not launch because its GLib dependency
was unavailable; the Nix Chromium package includes its runtime dependencies.

**How to apply:** Keep browser executable selection portable and document the
override instead of checking a machine-specific Nix store path into test code.

Browser harnesses rooted outside the production source tree must explicitly
include that source tree in Tailwind scanning.

**Why:** Otherwise imported components can render without their utility classes;
loading skeletons collapse and responsive/RTL assertions can pass on unstyled
markup instead of the real layout.

**How to apply:** When adding a test-only Vite root, scan production components
from its CSS entry and retain the application's real CSS. Check visible loading
states and responsive visibility rather than treating a successful import as
proof that utilities were generated.

Separate obsolete response effects from already committed learner credit.
Account changes retire the submitting session, even if the same account returns;
ordinary navigation within that session should still refresh saved progress.

**Why:** Dropping a late result prevents cross-account disclosure, but must not
undo a successful write or prevent the original learner from seeing it later.
Matching account IDs alone cannot distinguish an earlier A → B → A session.

**How to apply:** For delayed-write regressions, hold delivery after commit,
inspect both UI results and inactive-query invalidation calls, and separately
verify ownership against isolated real records. Keep ordinary same-session
navigation distinct from authentication changes when suppressing callbacks.
