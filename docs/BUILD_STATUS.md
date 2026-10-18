# Ethio HUDHUD — working pilot and release checklist

## Implemented

- Arabic-first responsive web app, English web UI and dark/light themes.
- Mobile-browser home-screen installation: Android install dialog when supported,
  manual browser-menu fallback, iPhone/iPad Add to Home Screen instructions, app
  manifest/icons and standalone launch. Dismissal waits seven days before prompting
  again; standalone sessions do not show it. This installs the web app, not the
  separate Expo/native app. Learning still needs an internet connection. The
  network-only service worker never caches learner data or authentication.
- Expo native companion with Arabic learning screens and device dark/light themes.
- Managed Clerk sign-up, sign-in and user-isolated persistent learning records.
- Protected responsive web administration at `/admin`: a real user directory,
  search/pagination, names/goals, suspension/restore, owner-only admin assignment,
  confirmed full account deletion, expiring complimentary AI grants, settings,
  lesson editing/creation/archive and a recent audit trail.
- Guest mode on the web; native learning requires sign-in.
- Onboarding: goals, selected proficiency, daily target (default 60 minutes),
  timezone, reminder preference, and a conservative three-question web placement check.
- Six courses with **12 distinct pilot lessons** and multiple-choice exercises.
- Server-side answer keys, per-question explanations, 75% pass threshold,
  one-time completion XP, active-time caps and a duplicate-submission window.
- Fidel reference, optional transliteration, and scheduled vocabulary flashcards.
- A 180-day introductory lesson/review plan; goal choice prioritizes a later
  course, while preserving foundations. This is **not** 120 unique lessons.
- Actual progress, study minutes, seven-day activity, streaks and vocabulary counts.
- Text-only Amharic tutor using Replit AI Integrations for OpenAI, Arabic explanations,
  scenarios, recent context and privacy preference. Administrator-configured request
  limits (default 20 free / 100 complimentary) per rolling 24 hours, plus a per-IP
  minute limit. Clearing chat does not reset usage or account restrictions.
- JSON learning-data export, chat deletion and learning-data deletion.
- Native OS share sheet for actual achievements.
- Native local daily reminder, with OS permission, in the device's local timezone.
- Schema, generated API clients/validators, migrations, idempotent pilot seed, unit tests.

## Deliberately not represented as complete

- **Content review:** no seed content is described as reviewer-approved. A qualified
  Amharic reviewer must verify orthography, translations, explanations, transliteration
  and exercise answer keys. Do not publish these pilots as a certified curriculum.
- **Curriculum size:** the requested 24 modules / 120 reviewed lessons, advanced
  curriculum, tutor-authored materials and full coverage are not yet authored.
- **Audio:** no fake recordings, speech synthesis, voice conversation, listening
  exercises, or fabricated pronunciation scores. Recordings need licensing/review;
  pronunciation analysis needs a provider that actually supports Amharic.
- **Payments:** Polar is requested but not configured. The Premium screen is disabled.
  There is no working checkout, webhook handler, entitlement activation, cancellation
  portal or refund flow. No other billing provider has been substituted.
- **Qualified review:** the admin editor is not a linguistic-review certification.
  Content edits reset status to pilot. Independent qualified-review approval is pending.
- **Community/tutors:** friends, competitive challenges, referrals, public tutor
  discovery, availability and booking are not implemented. There are no invented
  tutors, bookings, testimonials or social statistics.
- **Notifications:** web reminder preference is saved only. No web push, server-side
  scheduled push, email campaign or quiet-hours engine. Native reminders are local
  device schedules, not a cloud delivery guarantee.
- **Offline:** bundled fonts/icon and cached queries are not an offline lesson
  download/synchronization system.
- **Account deletion:** learner self-service deletes learning records only.
  Authorized admins can permanently delete another user's sign-in identity and
  learning records after exact-email confirmation. The owner and destructive
  self-actions are protected. Administrative audit records are retained.
- **Guest-to-account migration:** browser guest work is not merged into a newly
  signed-in account. Sign in before studying if cross-device continuity matters.
- **Plan personalization:** introductory goal-based ordering is present; there is
  no adaptive proficiency engine or validated placement assessment.
- **App stores:** native distribution builds, store submissions, signed-in device
  verification and production release have not been completed.

## Architecture decisions

The existing pnpm workspace uses React/Vite, Express, PostgreSQL and **Drizzle**.
The source brief requested Prisma; this build preserves the scaffold's Drizzle
database rather than adding a competing ORM. OpenAPI is the contract; Orval
generates web/native hooks and Zod schemas from it.

The signed-in identity is provided by Clerk; the browser uses its session cookie
through the configured proxy. Native uses the Clerk SDK, SecureStore token cache,
and a bearer token getter. Never put the Clerk secret key in an Expo public variable.

Guest identities use signed HttpOnly cookies. Every learner-owned query/mutation
is scoped to the resolved learner. API answers never expose a lesson answer key
before submission. Completion XP is protected by a database uniqueness constraint.

AI transcript retention is optional. Disabling it deletes stored chat, but messages
are still sent to the model provider for processing. Content-free usage records are
separate so retention changes cannot reset the usage allowance.

Local rate limits and in-flight guards are per API process. Before multi-instance
production scaling, replace them with shared rate limiting / distributed locks.

## Setup

From the workspace root:

```sh
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
pnpm --filter @workspace/api-spec run codegen
pnpm run typecheck
pnpm --filter @workspace/api-server test
```

Use the existing managed artifact workflows for the API server, web app and Expo.
Their injected `PORT`/`BASE_PATH` values and preview routing must be preserved.
Do not start duplicate dev servers or hardcode localhost in application API calls.

For a new clean database, SQL migrations are in `lib/db/drizzle`; apply them with
`pnpm --filter @workspace/db run migrate`, then seed. The development database was
initialized using Drizzle schema push, so do **not** blindly replay migrations on
it: establish a baseline or use a fresh database first. Never run schema DDL from
API request handlers or automatically on server startup.

The seed runs idempotently on API startup after schema setup. It does not overwrite
existing content, and it never marks material as reviewed. Editing seed source
does not update already seeded records; use an explicit reviewed migration/update.

### Configuration (workspace secrets / environment settings)

See `.env.example` for variable names only; no keys are committed. Clerk and OpenAI
are provisioned via Replit's supported setup. Database connection and session
signing secret are server-only. The Expo development command forwards only the
publishable Clerk key; the build script does the same for release bundles.

For a future production deployment, configure the real published API domain for
Expo's `EXPO_PUBLIC_DOMAIN` through the build environment. The current development
command uses the development domain, which must not become a production canonical
URL. Register native redirect URLs and store bundle identifiers before release.

### Manual verification / mobile release checklist

1. Create a fresh account, verify email and finish onboarding.
2. Complete a lesson, restart the app and confirm progress survives.
3. Sign in to that account on the other client and confirm the same progress.
4. Use another account and confirm no previous learner records appear.
5. Verify wrong answers, retry, duplicate submission, one-time XP and quiz errors.
6. Verify SRS due times, midnight/streak boundaries and the selected timezone.
7. Test Google SSO, password recovery, client-trust email verification and cancellation
   on physical iOS and Android devices; do not claim these from an anonymous screenshot.
8. Test font scaling, Fidel glyph rendering, Arabic reading order, keyboard movement,
   long lessons, dark mode and small screens.
9. Grant/deny local notification permission; change reminder time, sign out, travel
   between timezones, and inspect OS notification delivery. Re-enable after timezone
   changes. No remote notification infrastructure is configured.
10. Verify tutor provider failure, rate limits, clearing chat, and disabled retention.
11. Verify JSON export and destructive learning-data deletion confirmations.
12. Add reviewed curriculum, production abuse controls, complete identity deletion,
    consent/privacy policies and the missing release features before a public launch.
13. Configure real billing only after signed webhook verification and server-side
    entitlement tests. Never grant Premium from a client redirect or button click.
