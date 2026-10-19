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
