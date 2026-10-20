# Renewal/access background notifications

Polar remains deferred. No paid records, billing enforcement, checkout or trial
pushes are created here. Only a currently enabled, unexpired admin grant supplies
a verified date today. A future Polar adapter must verify webhook signatures,
subscription status, cancellation and period/expiry dates server-side before
returning a `VerifiedReminder`. Never accept billing dates from a device.

## Runtime

The API checks once a minute while running, including after restart. Production
needs a continuously running server, or an external scheduled runner executing
`pnpm --filter @workspace/api-server reminders:send` against the same database.
A sleeping API process alone cannot guarantee timely background work.
The one-shot entrypoint can run concurrently with the API: durable claims prevent
duplicate attempts. Apply the additive Drizzle schema before starting this code.

## Web setup

Use the workspace secure Secrets flow for `RENEWAL_VAPID_PRIVATE_KEY` and
`RENEWAL_VAPID_PUBLIC_KEY` (a matching VAPID P-256 keypair), and configure
`RENEWAL_VAPID_SUBJECT` with a real operator `mailto:` contact or HTTPS URL.
Do not put private keys in files, source control, logs, chat or client bundles.
The UI explicitly reports unavailable delivery until valid keys are configured.
Keep the keypair stable; rotating keys requires browser re-enrollment.

HTTPS and Push/Notifications/Service Worker support are required. Android
Chromium browsers support Web Push. On iOS/iPadOS 16.4+, the learner must add
the site to the Home Screen and launch that installed PWA before requesting
permission. Denied permission requires changing the site's OS/browser settings.
The user must press Enable; no guest enrollment or automatic permission prompts.

## Native setup

Use a real native build with the expo-notifications plugin, its genuine Expo
project ID and valid APNs/FCM push credentials managed by the native build
provider. Expo Go and web previews are explicitly marked unsupported. Never
invent a project ID or claim that a preview is receiving background pushes.
The app obtains the real Expo push token only after permission and opt-in.
Native pushes are data-only. The registered expo-task-manager headless task
checks the persisted account binding, consent, expiry and period before creating
a local renewal notification. iOS builds enable remote-notification background
mode through the notifications plugin. OS force-quit, battery and background
execution restrictions can delay or suppress these tasks; there is no guarantee
of display. No old-account message is auto-displayed by APNs/FCM.
If Expo enhanced push security is enabled, supply `EXPO_PUSH_ACCESS_TOKEN`
through Secrets. The server supports that optional token for sends and receipts.

## Semantics

Four **elapsed** days before the verified UTC expiry, not four local midnights.
Timezone/DST changes update device metadata/display but cannot shift the instant
or generate another period key. Late workers send only within the four-day
window, never after expiry. Grant cancellation, suspension or deletion is checked
immediately before dispatch. Messages already accepted by an OS/provider cannot
be recalled. Provider TTL is capped at one hour and at the remaining access time.

Consent is per account and installation. Enable on a different account transfers
the physical endpoint; delivery history stays private to its original account. Sign-out
durably clears local consent, browser worker binding and native display consent.
Remote withdrawal is best-effort during sign-out, so an API outage cannot block
leaving the account. An installation that never enrolled makes no withdrawal
request. Account changes clear local delivery binding too.
Each enrollment also stores a hashed, device-held disable-only capability.
The client queues withdrawal durably before clearing local consent. An account
switch can therefore revoke the previous binding without impersonating that
account; failures are retried on return/reconnect. A delayed old-account
capability cannot disable the next account. Explicit authenticated opt-out
always calls DELETE regardless of whether the local owner flag was cleared.
Learner deletion cascades to device registrations and claims. Study reminder
changes cancel only study identifiers/legacy study notices, never renewal ones.

Each device/kind/normalized expiry has one durable dispatch claim. A crash or
ambiguous timeout is **unknown**, not success; it is not automatically retried
because that could duplicate a bill-related notice. Definitive provider rejection
is failed; invalid subscriptions/tokens are expired. Expo receipts are checked
separately. Accepted means provider acceptance, confirmed means handoff to the
device service, neither promises display or reading. Web Push has no device
delivery receipts. In-app reminders are always retained as the fallback.
