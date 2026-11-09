# EthioDeploy deployment guide

This project can run on EthioDeploy as one Node web service: Express serves the
API, Clerk proxy, Polar webhooks, and the Vite-built React app. The existing
Replit development and deployment setup remains split into separate services.

## 1. Prepare a private GitHub repository

EthioDeploy deploys from GitHub. The current Replit Git remote is an internal
Replit host and is not available to EthioDeploy. Connect a private GitHub
repository containing this project to EthioDeploy; do not make it public.
Deploy a branch preview first and keep the current Replit-hosted domain intact
until the new service passes the checks below.

## 2. Create the web service

Use these commands and settings in EthioDeploy:

- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build:ethiodeploy`
- Start: `pnpm run start:ethiodeploy`
- Health check: `/api/healthz`
- Runtime: Node.js service listening on the platform-provided `PORT`
- Set `SERVE_WEB=true` at runtime.
- Keep one always-on web instance initially. This process also runs the
  scheduled reminder and billing workers.

The build command typechecks the web app and API, builds the web app at `/`,
and bundles the API service. It requires `VITE_CLERK_PUBLISHABLE_KEY` as a
build-time variable. Configure `VITE_CLERK_PROXY_URL` as
`/api/__clerk` if the current Clerk tenant requires the same-origin proxy.

## 3. Configure runtime variables securely

Add values in EthioDeploy's encrypted environment-variable/secrets settings.
Never commit secret values to GitHub.

Required for the app:

- `DATABASE_URL` — EthioDeploy managed PostgreSQL connection.
- `SESSION_SECRET` — a new, randomly generated long secret for this host.
- `ADMIN_BOOTSTRAP_EMAIL` — `teamgog3@gmail.com`.
- `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY` — only after confirming the
  current Clerk tenant accepts requests from the EthioDeploy preview and the
  production domain.
- `OPENAI_API_KEY` — a provider-owned key for the AI tutor. Replit's AI
  integration credentials are not assumed to work outside Replit.
- `POLAR_LIVE_ACCESS_TOKEN` and `POLAR_LIVE_WEBHOOK_SECRET` — transfer through
  EthioDeploy's secret manager, not through chat or source control.
- `PUBLIC_APP_ORIGIN` — the final HTTPS origin, `https://ethiohudhud.com`.
- `ALLOWED_ORIGINS` — comma-separated allowed browser origins if more than the
  public origin is needed, for example the `www` origin during redirect setup.

The approved one-time Polar product IDs are fixed in the server's live billing
policy. Do not configure the old monthly product ID from `.replit`; it is stale
and is not used by the API server.

For web push reminders, also configure the matching `RENEWAL_VAPID_PUBLIC_KEY`,
`RENEWAL_VAPID_PRIVATE_KEY`, and `RENEWAL_VAPID_SUBJECT`. Use the existing VAPID
key pair only if its private key can be transferred securely; otherwise create
a matching pair and update the app's push subscriptions after migration.

`PORT` is provided by EthioDeploy. The service reads `DATABASE_URL` at runtime.
Do not set `WEB_PUBLIC_DIR` unless the build output is moved from its default
path, `artifacts/ethio-hudhud/dist/public`.

## 4. Provision the database

Create a managed PostgreSQL database and set its connection string as
`DATABASE_URL`. Apply the checked-in Drizzle migrations before starting the
service:

```sh
pnpm --filter @workspace/db run migrate
```

The service seeds the curriculum and checks the configured owner during
startup. Do not point this new service at an empty database and then switch the
domain: existing users, learning progress, billing records, audit history, and
reminder settings are stored in PostgreSQL and need a separately approved,
backed-up data migration.

## 5. Verify on the EthioDeploy preview

Before changing DNS, verify all of the following on the temporary service URL:

1. `/` and direct routes such as `/learn`, `/account`, and `/admin` load after a
   reload.
2. `/api/healthz` returns `{"status":"ok"}` and an unknown `/api/...` path does
   not return the React HTML page.
3. Google sign-in/sign-up, sign-out, account recovery, and admin access work.
   Replit documentation does not explicitly confirm portability of a
   Replit-managed Clerk tenant to external hosting, so treat successful auth
   on the external preview as a launch gate.
4. Course access is based only on verified entitlements; test with Polar
  sandbox or existing test coverage, not a real card.
5. The AI tutor works with the provider key; web push subscriptions and
   background reminders work if those features are enabled.
6. Check server logs for database, Clerk, Polar, and worker errors.

After domain cutover, update the live Polar webhook endpoint to:

`https://ethiohudhud.com/api/billing/polar/live/webhook`

Keep the current Replit deployment and database intact until the new service,
auth, data, webhooks, and reminders are verified. Obtain a database backup and
explicitly approve the production user-data migration and traffic cutover
before doing either; DNS values must come from the EthioDeploy project screen,
not from the old Replit domain setup.
