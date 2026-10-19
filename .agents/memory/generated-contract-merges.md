---
name: Generated API contract merges
description: Why merged API clients and validators must be regenerated from the shared contract.
---

After integrating API changes from multiple tasks, use the OpenAPI contract as the authority and regenerate clients and validators instead of resolving generated declarations by hand.

**Why:** A cross-task merge produced validation code that referenced a constant before initialization. Bundling succeeded, but type checking exposed a startup-breaking ordering error. The same merge also left token-breaking line wraps in handwritten route code, so repairing only the first syntax error was insufficient.

**How to apply:** Preserve all merged contract features, regenerate their derived code, and verify workspace types plus production server startup. A successful bundler run alone does not prove the generated validation module can initialize. Do not restore entire files from older revisions and accidentally discard unrelated merged features.
