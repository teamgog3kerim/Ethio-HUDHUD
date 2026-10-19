# Six-month learning-path regression suite

Run the full check from the workspace root:

```sh
pnpm run test:learning-path
```

This command fails on any failing layer. It runs:

1. Existing API unit tests, including curriculum validation and the 75% quiz threshold for every seeded lesson.
2. Shared learning-path tests (six months / 24 weeks, all month boundaries, empty/uneven months, immutable cache inputs, resume and completion totals).
3. Twelve Playwright cases: six scenarios on desktop and again at 390 × 844 with Arabic RTL and reduced motion.
4. The real Express completion-route integration test. This is explicitly enabled by the command, not silently skipped.

## Prerequisites

- Install workspace dependencies with `pnpm install --frozen-lockfile`.
- A Chromium browser. Replit uses the Nix `chromium` package in `.replit`.
  Elsewhere run `pnpm --filter @workspace/ethio-hudhud exec playwright install chromium`
  (Linux CI may need Playwright's OS dependencies). You can override the executable
  with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`; otherwise system Chromium is preferred
  and Playwright's pinned browser is the fallback.
- `DATABASE_URL` must point to a migrated, seeded **development or disposable test**
  PostgreSQL database for the API layer. Do not point these commands at production.
  Database setup is separate: these tests never push a schema, seed, truncate,
  archive, or modify curriculum records.
- Port 4179 must be free. Playwright starts and stops its own test-only Vite server;
  it deliberately refuses to reuse an existing server. Normal app workflows and
  Clerk access are not needed for the browser tests.

## Scenarios

- Pass a quiz, see updated path progress, reload, pass again, return to Learn,
  reload again, and retain one completed lesson and the correct resume link.
- Fail, retry with cleared answers, fail again, reload Learn, and keep zero
  completions/XP.
- Receive a grading-request error, show no result or completion, retry the same
  answer payload, and award credit only after a successful server response.
- Follow Next and Back through all five month boundaries (including stage changes)
  and verify the first/last lesson edges; browsing never sends a completion.
- Navigate away with a partial answer/delayed callback, return to question one,
  finish, navigate to the next lesson, and return without stale results or answers.
- Use all six month selectors and stage controls in Arabic; assert no horizontal
  page overflow on Learn, lesson reading, quiz and result views; inspect computed
  animation and transition durations with reduced motion enabled.

## Isolation and scope

The browser suite uses the **real Learn and Lesson pages, Shell, React Query
hooks, Wouter links, language provider, timer, and production CSS**. Only Clerk
hooks are replaced by a test-only guest adapter. Each browser test gets a new
browser context and its own in-memory API records, based on the real curriculum
seed. The records survive that test's reloads but cannot reach any database or
account. Every `/api/` request is intercepted; unexpected endpoints and browser
runtime exceptions fail the test.

Browser grading responses are a contract double, not evidence of backend grading.
The separate integration test mounts the **real learning router** with a trusted
test-only guest identity and a real database. It creates one random UUID learner,
reads existing active lessons without changing them, and deletes only that learner
in teardown (including its cascading starts, attempts, reviews and completions).
Teardown also runs on assertion failures. It checks invalid submissions, forged
client success fields, server-only answer keys, failed/deduplicated attempts,
passing/reloaded progress, review creation, and stable completion ID/timestamp/XP
after both immediate replay and a new passing attempt outside the duplicate window.

The test server and guest adapters are not imported by the normal app entry.
These checks do not cover Clerk sign-in, published deployment routing, or a
single browser-to-database end-to-end session.

## Focused commands and failure output

```sh
# Browsers only; no database or credentials needed
pnpm --filter @workspace/ethio-hudhud run test:learning-path

# One browser project
pnpm --filter @workspace/ethio-hudhud run test:learning-path --project=arabic-mobile-reduced-motion

# Real API persistence only (development/test DB required)
pnpm run test:learning-path:api
```

Browser fixtures and specs have a separate TypeScript check, run automatically
before Playwright. Failure traces are written under
`generated-artifacts/learning-path/`, ignored by Git and publication packaging.
Use `pnpm --filter @workspace/ethio-hudhud exec playwright show-trace <trace.zip>`
to inspect a failed run. Fix unexpected request fixtures deliberately; never
replace strict interception with passthrough to a live API.
