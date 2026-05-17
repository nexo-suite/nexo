# Architecture

## Overview

Nexo is a monorepo of independent SvelteKit apps that share a single PostgreSQL database and a central auth service. Each app is a self-contained PWA deployable as a home screen icon on iOS.

```
nexo/
├── apps/
│   ├── auth/        → auth.krieger2501.de   — OIDC provider, login UI
│   ├── admin/       → admin.krieger2501.de  — Container management, user access
│   ├── finance/     → finance.krieger2501.de — Personal finance tracker
│   ├── landing/     → krieger2501.de         — App directory + /apps route
│   └── bot/         → internal               — GitHub webhook bot (deploy automation)
└── packages/
    ├── db/          → Drizzle schemas + migration runner
    ├── errors/      → Error codes + i18n user messages
    ├── logger/      → Structured JSON logging (pino) with correlation IDs
    ├── i18n/        → Language detection utilities, Language type
    └── email/       → Email templates (React Email)
```

---

## Authentication flow

All user-facing apps delegate authentication to the central auth server via OAuth 2.0 / OIDC. The auth server is the only service that knows about passwords or OAuth provider credentials.

```
1. User opens finance.krieger2501.de
2. hooks.server.ts checks for a valid Better Auth session cookie
3. No session → redirect to auth.krieger2501.de/login?redirectTo=...
4. User clicks "Sign in with Google" (or GitHub / Discord)
5. Browser goes to provider → provider redirects back to auth server callback
6. Auth server checks auth.allowed_emails table
   - Not found → redirect to /not-authorized
   - Found → create session, set cookie on auth.krieger2501.de domain
7. Auth server checks auth.user_app_access for the target app
   - No access → redirect to /not-authorized-app
   - Has access → continue
8. Auth server redirects back to the original app URL
9. App's hooks.server.ts now sees a valid session via the auth server API
10. User is in
```

The session cookie is set on the **auth domain**, not the app domain. Each app validates the session by calling the auth server on every request — there is no JWT passed between apps.

---

## Database layout

One PostgreSQL instance, one database (`nexo`), namespaced by Postgres schema:

```
nexo (database)
├── auth (schema)
│   ├── user                — one row per user (Better Auth managed)
│   ├── session             — active sessions (Better Auth managed)
│   ├── account             — OAuth provider links (Better Auth managed)
│   ├── verification        — email verification tokens (Better Auth managed)
│   ├── oauth_application   — OIDC client registrations
│   ├── oauth_access_token  — issued OIDC tokens
│   ├── oauth_consent       — user consent records
│   ├── allowed_emails      — email whitelist; controls who can sign in
│   ├── user_app_access     — per-user, per-app access control (active)
│   └── user_preferences    — global prefs: language, theme, birthday
└── finance (schema)
    ├── accounts            — bank/cash accounts
    ├── expenses            — recurring and one-off expenses
    ├── income              — recurring and one-off income
    ├── debts               — money owed to/from others
    └── user_settings       — per-user finance prefs (currency, display name, week start)
```

Every app-schema table has a `user_id TEXT` foreign key referencing `auth.user.id`. This means every query is automatically scoped to the authenticated user.

**All schemas are defined in `packages/db/schema/`** and consumed by every app as a workspace dependency (`@nexo/db`).

---

## Monorepo structure

```
nexo/
├── .env                        ← secrets (gitignored)
├── .env.local                  ← local overrides (localhost DATABASE_URL for Drizzle CLI)
├── .env.example                ← template, committed
├── docker-compose.yml          ← all service definitions (production, preview, server profiles)
├── docker-compose.override.yml ← local dev overrides (swaps https URLs for localhost)
├── Caddyfile                   ← reverse proxy + TLS config
├── knip.config.ts              ← workspace-aware dead-code config
├── turbo.json                  ← task pipeline (build order, caching)
├── pnpm-workspace.yaml         ← workspace package globs
├── vite.shared.ts              ← shared Vite config (merged by all apps)
├── package.json                ← root scripts, shared dev deps
├── tsconfig.json               ← base TS config (extended by all packages)
├── grafana/                    ← Grafana provisioning (datasources, dashboards)
├── loki/                       ← Loki config (local-config.yaml)
├── apps/
│   └── <app>/
│       ├── src/
│       │   ├── app.html
│       │   ├── app.css          ← design tokens (@theme for Tailwind v4)
│       │   ├── app.d.ts         ← App.Locals, App.PageData types
│       │   ├── hooks.server.ts  ← auth guard + security headers + i18n
│       │   ├── lib/
│       │   │   ├── server/      ← server-only code (never imported by .svelte files)
│       │   │   ├── components/
│       │   │   ├── paraglide/   ← generated i18n message functions
│       │   │   └── i18n.ts      ← Paraglide i18n configuration
│       │   └── routes/
│       │       ├── +layout.server.ts  ← session + shared data load
│       │       ├── +layout.svelte
│       │       ├── auth/callback/+server.ts  ← OIDC callback handler
│       │       └── [feature]/
│       │           ├── +page.server.ts
│       │           └── +page.svelte
│       ├── project.inlang/     ← Paraglide project config
│       ├── messages/           ← i18n message files (en.json, de.json, tr.json)
│       ├── svelte.config.js    ← adapter-node, Svelte compiler options
│       ├── vite.config.ts      ← Vite + PWA + Paraglide plugin config
│       ├── eslint.config.js
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── auth.ts
│   │   │   └── finance.ts
│   │   ├── src/
│   │   │   ├── index.ts        ← Drizzle client + all schema exports
│   │   │   └── migrate.ts      ← migration runner (used by Docker)
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── errors/
│   │   └── src/index.ts        ← error codes + i18n userMessage(code, lang)
│   ├── logger/
│   │   └── src/index.ts        ← pino logger factory with correlation ID support
│   ├── i18n/
│   │   └── src/index.ts        ← Language type, detectLanguage() from headers
│   └── email/
│       ├── src/                ← React Email templates
│       └── package.json
└── .github/workflows/
    ├── ci.yml                  ← lint + type-check + build + test on PRs
    ├── deploy-production.yml   ← auto-deploy on release tag
    ├── deploy-preview.yml      ← deploy preview env on PR
    ├── release-please.yml      ← auto-version + changelog
    └── auto-approve.yml        ← auto-approve renovate PRs
```

---

## Request lifecycle (finance app example)

```
Browser → Caddy (TLS termination)
       → finance:3000 (SvelteKit Node server)
          → hooks.server.ts
             → i18n.handle() — resolve language from prefs/cookie/header
             → authClient.getSession() → HTTP call to auth:3000
             → session valid: attach user to event.locals, continue
             → session missing: redirect to auth:3000/login
             → securityHeaders handle — X-Frame-Options, X-Content-Type-Options, Referrer-Policy
          → +layout.server.ts
             → db query: user_settings + user_preferences for locals.user.id
          → +page.server.ts
             → db queries: expenses, income, etc. scoped to user_id
          → +page.svelte renders (with i18n message functions)
```

---

## Observability

All apps emit structured JSON logs via `@nexo/logger` (pino). In production:

```
App container → stdout (JSON) → Docker Loki log driver → Loki → Grafana
```

Each request gets a correlation ID (`x-correlation-id` header) that propagates through all log lines for that request. Error responses include the correlation ID so users can report it for debugging.

Grafana is provisioned automatically via `grafana/` directory with a Loki datasource. Access at `grafana.krieger2501.de` (server profile only).

The admin app's Services panel shows container health, and its log viewer queries Loki directly for real-time log streaming with field selection.

---

## Internationalization

Each SvelteKit app uses [Paraglide.js](https://inlang.com/m/gerre34r/library-inlang-paraglideJs) for compile-time i18n. Messages are defined per-app in `messages/{en,de,tr}.json` and compiled to type-safe functions (`m.key()`).

Language resolution priority:

1. User's `language` field in `auth.user_preferences` (if not `'auto'`)
2. `Accept-Language` header → best match via `@nexo/i18n` detectLanguage()
3. Fallback: `'en'`

Supported languages: English, Deutsch, Türkçe.

---

## Tech decisions

**Why one monorepo instead of separate repos?**
Shared Drizzle schema is the killer reason. When you rename a column in `finance.ts`, the TypeScript error shows up immediately in the app. With separate repos you'd need to publish an npm package, bump a version, and update a dependency — for a personal project that's pure friction.

**Why not one big SvelteKit app?**
Each PWA needs its own `manifest.json` with its own name, icon, and theme color so iOS treats them as distinct home screen apps. A single app at one domain can only have one manifest.

**Why Better Auth as an OIDC provider instead of Authentik/Keycloak?**
Authentik and Keycloak are enterprise SSO servers that run as separate heavyweight services. Better Auth runs inside your existing SvelteKit app, uses your existing database, and is configured in TypeScript. For 10 users it's the right level of complexity.

**Why Caddy instead of Nginx?**
Caddy provisions and renews Let's Encrypt certificates automatically. With Nginx you'd also need Certbot and cron jobs. The Caddyfile for this project is 10 lines.

**Why Paraglide instead of i18next / svelte-i18n?**
Paraglide compiles messages to tree-shakeable functions at build time — no runtime bundle, no loading states, full type safety. For a small app with 3 languages it's the lightest option.

**Why pino + Loki instead of Datadog / Sentry?**
For a personal project on a €5/mo VPS, a fully self-hosted log stack (pino → stdout → Loki → Grafana) costs nothing extra and gives full-text search over structured logs. Sentry would be overkill for 10 users.
