# Scheduled study reminders

- Study reminders are opt-in, follow the saved study weekdays, timezone and
  180-calendar-day schedule, and stop while paused or when access is unavailable.
- Account preferences use the existing reminder fields. Dismiss/snooze state
  never writes lesson completion or grading records.
- Web Push enrollment is separate from renewal consent, with its own service
  worker registration, binding and disable-only revocation capability.
- A purpose-separated HKDF signing key is derived from the stable shared
  `SESSION_SECRET` (minimum 32 characters). Only the public key leaves the server.
  Keep this secret stable across restarts, deployments and scheduled runners.
  Rotation requires device re-registration; returning consented devices refresh
  without requesting permission again. No new notification-service account is
  required.
- Delivery runs once per minute while the API process is running. **Autoscale
  can sleep when idle**: this loop alone cannot provide reliable closed-app
  scheduled delivery. Use an always-running web service, or an authorized
  scheduled runner using the same database and `SESSION_SECRET`.
- One-shot runner: `pnpm --filter @workspace/api-server run study-reminders:send`.
  Run every minute for minute-level scheduling; do not expose a public HTTP
  endpoint for this job. Publishing/runtime changes require owner approval.
- Claims survive restarts and concurrent workers. A timeout is `unknown`, not
  success, and is not automatically retried. Provider acceptance does not prove
  receipt. Browser/device permissions and OS settings still apply.
- iOS/iPadOS Web Push requires a supported version (16.4+) and installation to
  the Home Screen. This implementation targets the installed **web app**, not
  the separate Expo artifact.

## Checks

```
pnpm --filter @workspace/api-server exec tsx --test src/lib/study-reminder-policy.test.ts
RUN_STUDY_INTEGRATION=1 pnpm --filter @workspace/api-server exec tsx --test src/lib/study-reminder-delivery.db.test.ts
node --test artifacts/ethio-hudhud/tests/study-worker.test.mjs
```

The integration test uses isolated fixture identities and mocked push delivery;
it does not send notifications to real learners.
