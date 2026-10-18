# Ethio HUDHUD

An Arabic-first Amharic learning pilot for web, iOS and Android.

## Run & Operate

- Use the existing managed API, web and Expo workflows; they supply PORT and routing.
- `pnpm --filter @workspace/api-server run dev` — run the shared API service
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- `pnpm --filter @workspace/db run seed` — idempotent pilot curriculum seed
- `pnpm --filter @workspace/api-server test` — grading, review interval, timer and admin policy tests
- `pnpm --filter @workspace/api-server run bootstrap-owner` — idempotent verified owner setup using `ADMIN_BOOTSTRAP_EMAIL`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ethio-hudhud` — React/Vite web client, Arabic/English UI
- `artifacts/hudhud-mobile` — Expo native client, Arabic UI
- `artifacts/api-server` — authenticated shared REST API and text tutor
- `lib/api-spec/openapi.yaml` — source of truth for generated clients and validators
- `lib/db` — PostgreSQL schemas, migrations and pilot seed
- `docs/BUILD_STATUS.md` — exact implemented scope, setup and release checklist

## Architecture decisions

- Preserve the scaffold's Drizzle ORM instead of introducing Prisma alongside it.
- Native sessions use Clerk SecureStore/bearer tokens; browser sessions use cookies.
- Local reminders are device schedules; web preferences do not imply notification delivery.

## Product

Working onboarding, 12 pilot lessons across six courses, Fidel practice,
server-graded exercises, vocabulary reviews, study plans, saved progress and a
text-only AI tutor. See BUILD_STATUS before describing this as a complete release.

## User preferences

Product integrity requirements are recorded in
`.agents/memory/product-integrity.md`; consult that file before extending scope
or claiming reviewer approval, voice capabilities or paid access.

## Gotchas

- Keep API keys and signing secrets server-only.
- The development schema used push; do not replay fresh SQL migrations without baselining.
- SQL migrations do not run at API startup; the startup seed is DML only.
- Polar billing, reviewed full curriculum and community/tutor-booking are not yet implemented.
- Responsive web administration lives at `/admin`. App permissions are stored and checked
  server-side, separately from learner data. Only the owner assigns administrator roles.
- Owner bootstrap requires verified email ownership in the current Clerk tenant. It runs
  at startup and on authenticated admin-access checks; tenant-scoped initialization
  markers prevent both development IDs suppressing production setup and privilege regrant.
- Apply new database schema through the normal publication migration flow before
  running this version in production. The API does not auto-run schema DDL.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
