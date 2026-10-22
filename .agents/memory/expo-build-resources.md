---
name: Expo publishing resource budgets
description: Why a passing workspace build can still fail in the smaller publishing environment.
---

Do not treat a successful workspace Expo build as proof that it fits the
publishing resource budget. Verify cold-cache native bundles with bounded
resources, and preserve both platforms rather than dropping the companion to
make website publishing pass.

**Why:** The workspace has more memory than the observed publishing builder
(8 GB versus 4 GB). A failed publishing log stopped during the second platform
without a final compiler exception, while the same build passed in the workspace.
Metro had already exceeded 2 GB after the first platform. This indicates a
resource risk, not proof of a specific out-of-memory termination.

**How to apply:** Check the actual builder configuration and the failing phase.
Test without shared temporary transform caches; a warm-cache success can conceal
the cost of a clean publish. Keep build-owned process cleanup separate from the
managed development servers. Do not change billing settings to debug compilation.
