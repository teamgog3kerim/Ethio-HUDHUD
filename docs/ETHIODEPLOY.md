# Deploy Ethio HUDHUD from GitHub to EthioDeploy

This deployment runs **the web/PWA and API together on one HTTP port**.
It does not build or run the separate Expo companion or the design sandbox.
Existing Replit preview/publishing configuration is retained.

## EthioDeploy project settings

Connect `teamgog3kerim/Ethio-HUDHUD` with EthioDeploy's GitHub App and choose the
branch containing these changes. Use the **repository root**, not an artifact
subdirectory. Select **Web Service** with Node.js/Nixpacks.

| Setting | Value |
| --- | --- |
| Node | 22 |
| Package manager | pnpm 10.26.1 (pinned in package.json) |
| Install | Use `nixpacks.toml`: installs pinned pnpm without Corepack, then frozen-lockfile dependencies |
| Build | `pnpm run deploy:build` |
| Start | `pnpm run deploy:start` |
| Bind | `0.0.0.0` |
| Port | EthioDeploy's `PORT`; fallback 3000 |
| Health URL, if configurable | `/api/healthz` |
| Static publish directory | None: this is a Node web service, not static-only hosting |

`nixpacks.toml` supplies install/build/start configuration automatically.
Keep the Root Directory set to the repository root so this file is discovered.
Clear stale custom install/build commands in EthioDeploy if they override this
file. The install phase prints Node/pnpm versions to help diagnose host issues.
Do not use the generic root `build` command for this host: it includes unrelated
artifacts. Keep build dependencies installed; Vite and TypeScript are required.

## Required variables

Use `.env.ethiodeploy.example` as the variable-name template, **not as a file of
working credentials**. Enter real values in EthioDeploy's encrypted project
settings. Never commit `.env` files, keys, passwords or database URLs to GitHub.

| Name | Needed when | Value |
| --- | --- | --- |
| `NODE_ENV` | Runtime | `production` |
| `VITE_PUBLIC_APP_URL` | Build and runtime | Your actual HTTPS public origin, no path; e.g. the hostname EthioDeploy assigns |
| `PUBLIC_APP_URL` | Runtime | Same origin as `VITE_PUBLIC_APP_URL` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Build | Production `pk_live_…` publishable key |
| `CLERK_PUBLISHABLE_KEY` | Runtime | Same publishable key as above |
| `CLERK_SECRET_KEY` | Runtime, secret | Matching production `sk_live_…` secret key |
| `SESSION_SECRET` | Runtime, secret | Cryptographically random value of at least 32 characters |
| `DATABASE_URL` | Runtime/migrations, secret | PostgreSQL connection string |
| `ADMIN_BOOTSTRAP_EMAIL` | Runtime | `teamgog3@gmail.com` (the owner's previously requested account) |

Publishable `VITE_*` values are deliberately embedded in browser JavaScript.
**Never put secret keys in a `VITE_*` variable.**

The build validates required public settings before compilation. The launcher
validates server settings before listening. `pnpm run deploy:check` validates
both groups without printing their values; it does not contact providers or
prove that credentials, DNS, or connectivity work.

### Authentication must be configured for the destination domain

The current project uses **Replit-managed Clerk**. Do not assume workspace
credentials or domain proxying will automatically work on a different host.
Before going live, arrange a production Clerk tenant/keys and authorize the
actual EthioDeploy/custom domain with that tenant. If retaining the managed
tenant, confirm that its configuration supports this destination first.
Access to the managed Clerk dashboard depends on the Replit account's access.
This repository preparation does not create a tenant or change provider settings.

Standard Clerk domain/DNS configuration can use the existing frontend and API
with `VITE_CLERK_PROXY_URL` and `CLERK_PROXY_URL` **unset**. Only use the optional
`/api/__clerk` proxy when that tenant's frontend API proxy has explicitly been
configured for the new domain. Set both proxy variables to the new HTTPS URL,
never the old Replit URL. Do not mix keys from different tenants or environments.

Changing Clerk tenants changes user IDs. Existing roles, progress and purchases
must be deliberately mapped if identities are moved; do not silently recreate or
merge accounts by email. Register and verify the configured owner's email in the
production tenant. The existing one-time owner bootstrap then grants the full
owner role. Verification, not merely typing the address, is required.

## PostgreSQL setup and existing data

The app still uses PostgreSQL; it has not been migrated or replaced here.
EthioDeploy offers a Postgres addon that injects its connection string. You may
instead keep your current PostgreSQL service if it permits connections from the
new host. Use the database provider's required TLS settings.

**For an empty new database:**

1. Provision the database and configure `DATABASE_URL`.
2. Run `pnpm run deploy:migrate` once in a release/console environment with the
   repository and pnpm available. This applies the committed Drizzle migrations.
3. If no pre-start console is available, explicitly set
   `RUN_DATABASE_MIGRATIONS=true` for the first launch instead. Start only one
   instance while applying migrations. After success set it back to `false`.
4. Startup seeds missing curriculum records automatically and non-destructively.
   Do not run a separate destructive reseed.

**For an existing database:** take a verified backup and inspect its migration
history first. A database previously managed with `drizzle-kit push` can already
have tables without Drizzle migration history; replaying the initial migrations
will fail with “relation already exists.” Do not enable startup migrations or
force-push the schema to work around that. Establish a reviewed baseline first.
The new migration included here adds the existing reminder-device schema needed
by a fresh installation; no migrations have been run against your current data.

Creating a new database gives a fresh installation. It does **not** copy learner
accounts, progress, roles, preferences, invitations, or subscription records.
An actual data transfer requires a separate backup/restore and identity check.

## Optional services

- **AI tutor:** set your own `OPENAI_API_KEY` (secret), optionally
  `OPENAI_BASE_URL` and `OPENAI_MODEL`. Provider billing is separate. Replit's
  managed proxy credentials are not a portable substitute. Existing managed
  integration support remains for Replit. With no AI configured, courses and
  scenario lessons work; the tutor explicitly reports that it is unavailable.
- **Browser push reminders:** configure a stable matching
  `RENEWAL_VAPID_PUBLIC_KEY`, `RENEWAL_VAPID_PRIVATE_KEY` (secret) and
  `RENEWAL_VAPID_SUBJECT` for Web Push. Learners must grant permission; HTTPS is
  required. Push subscriptions belong to an origin, so old-origin devices need
  to register again. Keep one reminder-sending instance until multi-instance
  delivery coordination is separately verified. In-app reminders remain available.
- **Payments:** Polar remains deferred as requested. Selecting a plan is not
  checkout, charging, or proof of a paid subscription. This deployment does not
  activate payment enforcement.
- **Analytics:** existing analytics hooks may not have a destination outside
  Replit. Re-verify the reporting destination and consent behavior separately;
  this deployment does not promise analytics delivery to EthioDeploy.

## Domain, PWA and release checks

1. Add the final domain and HTTPS certificate in EthioDeploy. Change
   `VITE_PUBLIC_APP_URL` and `PUBLIC_APP_URL` together, update Clerk's domain
   configuration, then rebuild. Invitations will use this build-time domain
   rather than the previous Replit address.
2. Push this prepared branch to GitHub using your normal reviewed Git workflow.
   EthioDeploy builds its selected branch. The GitHub readiness workflow checks
   tests and the production build with synthetic, non-working compile fixtures;
   it does not deploy or use real production credentials.
3. Check build and startup logs. The API listens only after curriculum startup
   succeeds. `/api/healthz` should return `{"status":"ok"}`.
4. Verify `/`, direct `/learn` and `/sign-in` navigation/reload, lesson saving,
   sign-out, plan selection and the verified owner's admin access.
5. Verify `/manifest.webmanifest`, `/sw.js`, and icons over HTTPS. Test Android
   installation and iOS Share → Add to Home Screen; test installed mobile layout.
6. Check invitations contain the final domain and no preview address.
7. Check optional tutor/push behavior and any existing data after migration.

An installed PWA is tied to its original origin. Moving hosting/domain does not
silently move existing installations; advise users to open and install the new
HTTPS site. Keep the old site available until cutover and data validation are done.

## Sources checked

- https://ethiodeploy.com/docs/deploys
- https://ethiodeploy.com/docs/frameworks
- https://ethiodeploy.com/docs/env-vars
- https://ethiodeploy.com/docs/addons
- https://nixpacks.com/docs/configuration/file

This guide prepares the repository. It does not publish to EthioDeploy, push a
GitHub branch, transfer secrets, configure DNS/auth, or migrate production data.

## If the dashboard says “nixpacks build failed (exit 1)”

That line is a summary, not the root error. Open the deployment's full build log
and find the first failed command and its preceding error lines.

- A Corepack signature/key-ID error or missing `corepack` is avoided by this
  configuration's explicit pnpm installation. Do not disable signature checks.
- `VITE_PUBLIC_APP_URL is required` or `VITE_CLERK_PUBLISHABLE_KEY is required`
  means those public build-time settings are missing in EthioDeploy. Add the
  real HTTPS origin and production publishable key. Do not use CI fixture keys.
- A production-key or origin-mismatch message means the configured values must
  be corrected; weakening validation would only ship broken sign-in or links.
- `Use pnpm instead`, npm workspace/catalog errors, or an unexpected Expo build
  means the wrong install/build command is running. Use the repository root and
  the commands above, not `npm install` in the repository or a recursive build.
- A failed dependency download, Nix download, disk/memory error or image-build
  error needs its specific log; a passing local compile cannot verify it.

If requesting help, include the failed step and about 30 lines before the summary.
Redact credentials, connection strings and tokens first.
