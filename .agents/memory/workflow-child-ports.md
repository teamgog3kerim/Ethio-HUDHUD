---
name: Workflow child ports
description: Managed restarts after merges can leave an older server child holding its port.
---

A workflow marked failed or waiting for an alternate port can coexist with an
older child server that still serves requests on the intended port.

**Why:** This environment has repeatedly retained API and Expo children after
automatic merge restarts; another restart alone reproduced address-in-use errors.

**How to apply:** Inspect the listener and verify its working directory before
stopping only the stale child. Restart the existing managed workflow on its
original port, rather than accepting Expo's alternate-port prompt or creating
another workflow. Do not terminate unrelated services.
