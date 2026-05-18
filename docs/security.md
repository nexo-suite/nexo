# Security & Privacy

This document describes how Nexo protects your account, your data, and the
infrastructure that runs the apps. It is intentionally specific: every claim
maps to a file or commit you can audit. Sections marked **Not yet** are
honest about gaps that are on the roadmap but not delivered today.

It also doubles as the source-of-truth for the user-facing privacy
statement. The user-rights and data-handling sections (`#data-we-collect`,
`#your-rights`, `#sub-processors`) are written so they can be lifted into
that statement directly.

---

## 1. Audience and scope

Nexo is a personal app suite operated by Kevin Rieger for a small,
explicitly invited group (friends and family — typically under twenty users).
The apps run on a single VPS behind Caddy:

- `auth.krieger2501.de` — sign-in + OIDC provider (Better Auth)
- `krieger2501.de` — landing / app directory
- `finance.krieger2501.de` — personal finance tracker
- `admin.krieger2501.de` — operator console
- `grafana.krieger2501.de` — log dashboards (operator only)

There is no public sign-up. Access is gated by an email allowlist
(`auth.allowed_emails`), and within that, per-app access is gated by
`auth.user_app_access`. See [access-management.md](./access-management.md).

---

## 2. Threat model

We design for these threats:

| Threat                                                    | Mitigation                                                                |
| --------------------------------------------------------- | ------------------------------------------------------------------------- |
| Cross-user data leak via app bug (missing `WHERE userId`) | Per-user Postgres RLS on `finance.*` and user-data tables in `auth.*`     |
| Single app process compromise reads other apps' data      | Per-app least-privilege Postgres roles; finance role can't write to auth  |
| Session theft from XSS                                    | HttpOnly + Secure + SameSite cookies; strict CSP; Svelte autoescaping     |
| Session theft from MITM                                   | HSTS preload, TLS 1.2+, HTTPS-only cookies in production                  |
| CSRF                                                      | Custom origin check on all state-changing requests                        |
| OAuth login abuse / unauthorised app access               | Email allowlist; per-app access table; explicit OAuth consent page        |
| SQL injection                                             | Drizzle ORM with parameterised queries; no string-concatenated SQL        |
| Backup exfiltration from VPS                              | All backups encrypted with `age`; private key kept off the VPS            |
| Loki / metrics endpoint scraping                          | Loki and the bot bound to `127.0.0.1` only — not exposed to the internet  |
| Unauthorised admin actions                                | Admin role gated by `user_app_access`; admin DB role has no finance reads |

We do **not** design against:

- Nation-state adversaries with VPS-provider-level access.
- A compromise of the operator's laptop where the backup private key lives.
- Targeted social engineering against an individual user's OAuth provider.
- Side-channel attacks on the VPS hardware.

---

## 3. Data we collect

This is the exhaustive list. Every column lives in one of two Postgres
schemas: `auth.*` (managed by Better Auth + Nexo extensions) or
`finance.*` (the finance app).

### 3.1 Identity (`auth.user`)

| Field            | Source               | Purpose                          |
| ---------------- | -------------------- | -------------------------------- |
| `email`          | OAuth provider       | Identifier; allowlist match      |
| `name`           | OAuth provider       | Display in UI                    |
| `image`          | OAuth provider (URL) | Avatar in UI                     |
| `email_verified` | OAuth provider       | Always `true` for OAuth sign-ins |
| `created_at`     | Server               | Account age, audit               |

We never see your OAuth provider password. Better Auth stores no Nexo-side
password — there is no password sign-in path.

### 3.2 Linked OAuth accounts (`auth.account`)

Per provider you've used to sign in:

- `provider_id` — `google` / `github` / `discord`
- `account_id` — your provider-side account ID
- `access_token`, `refresh_token`, `id_token`, `scope`, expiry timestamps

These tokens let Nexo refresh your session without bouncing you back to the
provider. They grant only the OAuth scopes you saw on the provider's
consent screen (typically `openid profile email`).

### 3.3 Sessions (`auth.session`)

Per active sign-in:

- `token` — opaque random session token (the value of your cookie)
- `expires_at` — typically 7 days from issue (Better Auth default)
- `ip_address` — your IP at the time of sign-in (used to render the
  sessions sheet so you can recognise stale sessions)
- `user_agent` — your browser string, parsed for the sessions sheet
- `created_at`, `updated_at`

You can rename and revoke sessions yourself from the landing page.

### 3.4 Email allowlist (`auth.allowed_emails`)

A flat list of emails that are permitted to sign in. Managed by the
operator via the admin app. Not exposed to other users.

### 3.5 Per-app access (`auth.user_app_access`)

Per `(user_id, app)`: which apps a user can open. Managed by the operator.

### 3.6 Cross-app preferences (`auth.user_preferences`)

- `language` — `auto` / `en` / `de` / `tr`
- `theme` — `system` / light / dark
- `birthday` — optional, used by the landing widget

### 3.7 OIDC provider state (`auth.oauth_application`, `auth.oauth_access_token`, `auth.oauth_consent`)

Nexo's auth server _also_ acts as an OIDC provider for its own apps. These
tables hold registered clients (the four Nexo apps), the access/refresh
tokens issued to them, and the consent records.

### 3.8 Finance app data (`finance.*`)

| Table           | Contents                                                               |
| --------------- | ---------------------------------------------------------------------- |
| `accounts`      | name, type, balance, currency, emoji/colour, "include in net worth"    |
| `expenses`      | name, category, amount, recurrence rule, due date, notes               |
| `income`        | name, amount, recurrence, expected/received date, notes                |
| `debts`         | counterparty name, direction (owe/owed), amount, due date, notes       |
| `transactions`  | materialised firings of recurring items (date, amount, description)    |
| `user_settings` | display name, currency, week-start day, default account, hide-cents,   |
|                 | forecast horizon, last reconciliation timestamp, session display names |

This is the most sensitive data we hold. See `#5-authorization-and-data-isolation`
for how it's compartmentalised, and `#10-what-is-not-yet-protected` for
the candid disclosure that **at-rest, server-side, this is plaintext**
(the operator and anyone with DB access can read it).

### 3.9 Operational logs

Pino-structured JSON logs shipped to Loki (`docs/observability.md`). Each
HTTP request is annotated with an 8-character `correlationId`.

What we log: the event class (`getSession`, `auth required`, `app access denied`,
`db error`, etc.), URL path, correlation ID, sometimes the user's email when
the event is auth-related (for the operator to be able to debug a sign-in
failure), and arbitrary structured fields on errors.

What we do **not** log: passwords, OAuth tokens, session tokens, financial
amounts, expense/debt/income names, account balances, notes, counterparties.

Loki retention is 7 days. Logs are **not** included in the encrypted database
backups — they age out independently.

### 3.10 Backups

`pg_dump | gzip | age` to disk on the VPS, optionally synced to Backblaze B2.
See `#8-backups`. Backups contain everything in §3.1–§3.8 in plaintext until
they are decrypted with the operator's offline key. They are encrypted before
ever touching the disk.

---

## 4. Authentication

### 4.1 Sign-in flow

We use [Better Auth](https://better-auth.com) with the OIDC provider plugin
(`apps/auth/src/lib/server/auth.ts`).

1. You click "Sign in with Google / GitHub / Discord" on
   `auth.krieger2501.de/login`.
2. The provider authenticates you and redirects back with an authorization
   code.
3. The auth server exchanges the code for tokens, then runs a post-callback
   hook that checks `auth.allowed_emails`. If your email is not on the list,
   the freshly-created session is **immediately deleted** and you're sent
   back to `/login?error=not_authorized`.
4. If allowlisted, you get a session cookie scoped to `*.krieger2501.de`.

There is **no email/password sign-in**. There is no email magic-link flow.
Reset emails do not exist because there is no password to reset.

### 4.2 Sessions and cookies

In production:

- `httpOnly: true` — JavaScript cannot read session cookies
- `secure: true` — cookies only travel over HTTPS
- `sameSite: lax` — cookies are sent on top-level navigation but not on
  cross-site embedded requests
- `domain: .krieger2501.de` — shared across all four apps so a single
  sign-in covers the whole suite

The `BETTER_AUTH_SECRET` env var signs and encrypts session-bound state.
Rotating it logs everyone out.

You can list and revoke your active sessions on the landing page
(`/apps`). The page uses Better Auth's `revokeSession` and
`revokeOtherSessions` APIs and renders sessions with a parsed user-agent

- IP + last-active timestamp so you can spot anything you don't recognise.

### 4.3 OIDC provider (Nexo apps signing in to each other)

When you open `finance.krieger2501.de` you are silently redirected to
`auth.krieger2501.de` to obtain an OIDC token. The auth server treats the
finance app exactly like any other OIDC client: there is an explicit
consent step on first sign-in
(`apps/auth/src/routes/oauth/consent/+page.server.ts`). Auto-consent is
**off** — the user always sees what scopes are being granted before
authorising.

### 4.4 What's not protected here

- **2FA** is not enforced at the Nexo layer. Whatever 2FA you have at
  Google / GitHub / Discord transitively applies — that is, if your
  provider account is 2FA-protected, an attacker without that 2FA cannot
  obtain a Nexo session. We rely on this transitively rather than
  layering an additional Nexo TOTP step.
- **Application-layer rate limiting** is not implemented. Better Auth's
  defaults provide some throttling on the auth endpoints; the rest of the
  apps don't have explicit rate limits. This is acceptable at our scale
  (under ten users, no public endpoints) but is on the watchlist if scale
  ever grows.

---

## 5. Authorization and data isolation

This is the most-strengthened part of the stack and the focus of the
recent security hardening sprint.

### 5.1 Per-app Postgres roles

Each app process connects to Postgres with its own login role rather than
the historical shared `nexo` superuser:

| Role          | Used by    | Schema grants (high level)                                                |
| ------------- | ---------- | ------------------------------------------------------------------------- |
| `app_auth`    | auth app   | Full CRUD on `auth.*`. No access to `finance.*`.                          |
| `app_finance` | finance    | Read-only on `auth.user/session/account` (for `getSession`); CRUD on      |
|               |            | `auth.user_preferences` (RLS-scoped); SELECT on `auth.user_app_access`    |
|               |            | (RLS-scoped); CRUD on `finance.*` (RLS-scoped).                           |
| `app_admin`   | admin      | SELECT on `auth.user/session/account`; CRUD on `auth.user_app_access` +   |
|               |            | `auth.allowed_emails`. **No direct access to `finance.*`** — totals       |
|               |            | come from a `SECURITY DEFINER` aggregate function.                        |
| `app_landing` | landing    | Read-only auth state; CRUD on `auth.user_preferences` (RLS-scoped); read- |
|               |            | only on `finance.*` (for the dashboard glance widget).                    |
| `nexo`        | migrations | Owner; only used by the migration container.                              |

A compromise of the finance app process now cannot delete sessions, edit
the email allowlist, or alter user-app-access — those grants are simply
not on its role.

### 5.2 Row-Level Security

Every `finance.*` table and the user-data tables in `auth.*` carry a
policy:

```sql
USING      (user_id = current_setting('app.current_user_id', true))
WITH CHECK (user_id = current_setting('app.current_user_id', true))
```

`FORCE ROW LEVEL SECURITY` is set, so the policy applies to every role
including the table owner. The single carve-out is `auth.user_app_access`,
which has a per-role second policy (`USING (true)`) granted to
`app_admin` so the admin app can list every user's access state.

The policy reads a Postgres GUC (`app.current_user_id`) which is set
per-request via the `withUser` helper:

```ts
// packages/db/src/with-user.ts
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>) {
 return db.transaction(async (tx) => {
  await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
  return fn(tx);
 });
}
```

`set_config(name, value, true)` is the function-call form of `SET LOCAL`,
which means the GUC is scoped to the open transaction and goes away when
it commits. We use the function form (rather than literal `SET LOCAL`)
because it accepts a parameterised value — `userId` is never
string-concatenated into SQL.

If a future code path forgets to wrap a query in `withUser`, RLS reads the
unset GUC as `NULL`, which compares unequal to every row's `user_id`, and
the query returns zero rows. **Forgetting `withUser` is a "no data"
failure, not a "wrong-user data" leak.** This is the design.

### 5.3 Why some tables are not RLS'd

Better Auth's adapter validates a request by:

1. `SELECT * FROM auth.session WHERE token = $cookie`
2. `SELECT * FROM auth.user WHERE id = session.user_id`

This happens **before** Nexo knows who the user is — establishing identity
is the goal of these queries. RLS on `auth.user` / `auth.session` /
`auth.account` / `auth.verification` would block them and break every
sign-in. Wrapping every Better Auth lookup in a `SECURITY DEFINER`
function is feasible but means forking the adapter and re-rolling on
every Better Auth release; it's tracked as future work.

The compromise is per-role grants: even though these tables are not RLS'd,
the `app_finance` role only has `SELECT` on them, the `app_landing` role
can `UPDATE`/`DELETE` `auth.session` (for the rename-and-revoke UI) but
not `INSERT`, and so on. A finance-app compromise still cannot forge a
session.

### 5.4 Defence in depth

Every server-side query keeps its `WHERE user_id = $userId` filter even
inside `withUser`. That gives us two independent controls — RLS _and_ the
explicit filter — both of which would have to fail before another user's
row could be returned. The shared helper `assertAccountOwned(tx, accountId, userId)`
adds a third check on cross-table foreign keys (e.g. attaching an expense
to an account you don't own).

---

## 6. Transport security

| Control              | Value                                              |
| -------------------- | -------------------------------------------------- |
| TLS                  | Caddy default — TLS 1.2 + 1.3 only, modern ciphers |
| Certificate          | Let's Encrypt, automatic renewal (Caddy-managed)   |
| HSTS                 | `max-age=63072000; includeSubDomains; preload`     |
| HSTS preload list    | Submitted for `krieger2501.de`                     |
| HTTPS redirect       | Caddy redirects HTTP → HTTPS for every host        |
| Cookie `Secure` flag | On in production                                   |

The HSTS preload makes the policy survive even a freshly-installed browser
that has never visited the domain — including all subdomains
(`*.krieger2501.de`).

---

## 7. Browser hardening

Set on every response by the per-app `securityHeaders` handle:

| Header                      | Value                                                       |
| --------------------------- | ----------------------------------------------------------- |
| `X-Frame-Options`           | `DENY` — no embedding in iframes                            |
| `X-Content-Type-Options`    | `nosniff` — disables MIME sniffing                          |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                           |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), payment=(),`     |
|                             | `usb=(), magnetometer=()` — none of these are used by Nexo, |
|                             | and an XSS cannot enable them                               |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload`              |

Cross-cutting:

- **CSRF.** A custom handle in the `sequence(...)` rejects
  state-changing requests whose `Origin` does not match an allowed origin
  for the app. SvelteKit's built-in CSRF check is disabled because of the
  cross-subdomain auth flow; the custom check replaces it.
- **XSS.** Svelte autoescapes all interpolated values by default. The few
  places that use `{@html ...}` are operator-only (admin app, log viewer)
  and feed only structured JSON.
- **SQL injection.** Drizzle parameterises every query. The codebase has
  no `sql.raw()` calls outside the migrations, and no places where user
  input is concatenated into SQL strings.
- **Open redirect.** The `redirectTo` query param on the auth flow is
  validated against `PUBLIC_*_URL` env vars before being used.

---

## 8. Backups

See `docs/deployment.md#backups` for full operational details.

- Nightly `pg_dump` of the Postgres instance.
- Piped through `gzip | age -R /etc/nexo/backup.recipient` before touching
  the disk. The recipient public key is stored on the VPS; the matching
  private key lives on the operator's laptop, with a paper copy stored
  separately.
- Encrypted `.age` files synced to Backblaze B2 with `rclone`. B2 sees
  only encrypted ciphertext — they cannot decrypt.
- Restore requires the offline private key. A VPS compromise alone
  cannot decrypt past dumps.
- Annual key rotation (or immediate rotation on suspected laptop
  compromise).

There is intentionally no "click to restore" path on the VPS.

---

## 9. Infrastructure

- **Hosting:** Single VPS (Ionos). Operator-managed, kernel auto-updated.
- **Runtime:** Docker Compose; one container per app + Postgres + Loki +
  Grafana + Caddy.
- **Network exposure:**
  - Caddy listens on `:80` and `:443`.
  - Postgres listens only on the internal Docker network (no published
    port). Nothing outside Docker can reach it.
  - Loki listens on `127.0.0.1:3100` — explicitly localhost-only.
  - The deploy bot listens on `127.0.0.1:3003` — Caddy proxies it.
  - SSH is configured to accept key-based auth only (operator's
    responsibility).
- **Container isolation:** No app container runs as root. No app
  container has access to the host Docker socket.
- **Secret handling:** Secrets live in `/opt/nexo/.env` on the VPS,
  readable only by the deploy user. Never committed; never logged.
- **Supply chain:** Dependencies are pinned via `pnpm-lock.yaml`. Renovate
  opens version-bump PRs that go through CI before merge. GitHub Actions
  workflows pin third-party actions by SHA, not by tag.

---

## 10. What is not yet protected

This section exists because the alternative — implying Nexo is more
hardened than it is — would be dishonest.

### 10.1 Server-side at-rest plaintext

Inside the database, financial data lives as plain SQL values. The
operator (or anyone who obtains DB credentials) can read every account
balance, expense name, debt counterparty, and note. The roles + RLS work
in §5 makes this _much_ harder for a compromised app process to do, but
it does not protect against:

- An operator who chooses to query the DB.
- A leaked `nexo` superuser password.
- A malicious migration.
- A backup whose decryption key has been compromised.

The roadmap entry for this is hybrid client-side encryption ("E2E"):
sensitive string fields (`name`, `notes`, `counterparty`, `description`)
encrypted in the browser with a key derived from a user passphrase, with
a recovery phrase as the second factor. This is tracked as Commit 8 and
is **not** delivered yet. When it ships, this section will be rewritten.

### 10.2 Better Auth core tables

`auth.user`, `auth.session`, `auth.account`, and `auth.verification` are
not RLS'd. See §5.3 for the reason. Defence-in-depth is per-role grants;
a finance-app process cannot insert/update/delete in any of them.

### 10.3 No application-layer rate limiting

Better Auth provides limited internal throttling. There is no per-IP or
per-account rate limiter on Nexo's own endpoints. At the project's scale
this is acceptable, but it is not a control we currently have.

### 10.4 No 2FA at the Nexo layer

We rely transitively on the OAuth provider's 2FA. If you sign in with
Google and your Google account has 2FA, an attacker without that 2FA
cannot reach Nexo. If you sign in with a provider where 2FA is off,
neither does Nexo enforce a second factor.

---

## 11. Your rights (privacy)

This section is written to satisfy GDPR / German BDSG and to be lifted
into the user-facing privacy statement.

### 11.1 What we collect and why

The exhaustive list lives in §3. Summarised by purpose:

| Purpose                                | Data used                                        |
| -------------------------------------- | ------------------------------------------------ |
| Letting you sign in                    | Email, name, OAuth tokens, sessions              |
| Showing your name and avatar           | `name`, `image`                                  |
| Routing you to apps you have access to | `auth.user_app_access`                           |
| Localising the UI                      | `auth.user_preferences.language`                 |
| Running the finance app for you        | Everything in `finance.*`                        |
| Operator debugging and abuse defence   | Logs (correlation ID, paths, occasionally email) |
| Disaster recovery                      | Encrypted nightly backups                        |

### 11.2 Lawful basis

- **Performance of a service you signed up for** (Art. 6(1)(b) GDPR) —
  we cannot run the finance app for you without storing the finance data
  you enter into it.
- **Legitimate interest** (Art. 6(1)(f)) — operational logs, abuse
  defence, encrypted backups.
- **Consent** (Art. 6(1)(a)) — sharing your identity with Google /
  GitHub / Discord at sign-in time happens only because _you_ clicked
  "Sign in with X" on their consent screen.

We do **not** process your data for advertising, profiling, or sale. We
do **not** use any third-party analytics.

### 11.3 How long we keep it

| Data                       | Retention                                         |
| -------------------------- | ------------------------------------------------- |
| Account, finance data      | While your account exists                         |
| Sessions                   | Until expiry (7 days) or you revoke               |
| OIDC access/refresh tokens | Per provider issuance; `refresh_token` 30 days    |
| Operational logs           | 7 days (Loki retention)                           |
| Encrypted backups          | Operator-managed; kept rolling, no fixed schedule |

When your account is deleted, the live database is purged immediately
(cascading FKs remove sessions, finance rows, preferences, app-access
rows). Backups taken before deletion may still contain your data until
the operator rotates them out — typically within a year.

### 11.4 Sub-processors

| Sub-processor             | Role                                              | What they see                              |
| ------------------------- | ------------------------------------------------- | ------------------------------------------ |
| Hetzner                   | VPS host                                          | The whole stack at runtime                 |
| Backblaze B2              | Off-site backup storage (optional)                | Encrypted ciphertext only                  |
| Let's Encrypt             | TLS certificate issuance                          | Public domain names only                   |
| Google / GitHub / Discord | OAuth identity provider — only the one you choose | What their consent screen disclosed to you |

We do **not** use Google Analytics, Plausible, Sentry, PostHog, Mixpanel,
Cloudflare, or any other CDN / analytics / tracking sub-processor.

### 11.5 Your rights

Under GDPR you have the right to:

- **Access** your data — request a copy.
- **Correct** it — most fields are editable in the UI; for the rest,
  contact the operator.
- **Delete** your account — contact the operator. Deletion is
  irreversible and cascades through `finance.*` and `auth.*`. Encrypted
  backups taken before the deletion may still contain your data until
  they age out.
- **Export** your data — the finance app does not yet have a
  one-click export; on request, the operator will produce a JSON dump.
- **Restrict** or **object** to processing — contact the operator. In
  practice this usually amounts to deleting the account.
- **Lodge a complaint** with a supervisory authority. For users in
  Germany this is the relevant _Landesbeauftragte(r) für Datenschutz_
  for the operator's state.

To exercise any of these rights, contact: **[contact email — TBD]**.

Rights you can exercise yourself without contacting anyone:

- Revoke an active session: landing page → Sessions sheet → "Sign out".
- Revoke every session except the current one: same sheet → "Sign out
  everywhere else".
- Change your display name, language, theme: landing page → Settings
  card.

### 11.6 International transfers

The VPS is in Germany (Hetzner). Backblaze B2 buckets are configurable;
if used, they may live in the EU or US depending on the operator's
configuration. The operator's choice is documented in the deployed
environment configuration.

OAuth providers handle their part of sign-in on their own infrastructure,
which may be outside the EU; this is governed by their own privacy
policies. We do not transmit data to them beyond what their consent
screen describes.

---

## 12. Reporting a vulnerability

Email: **[security contact — TBD]**.

If you want to encrypt the report, the GPG public key fingerprint is
**[TBD]**.

We aim to acknowledge within 72 hours, fix or scope a fix within 14
days, and disclose publicly once a fix is deployed (or after 90 days,
whichever comes first). This is a personal project — there is no bug
bounty, but credit will be given in the security changelog if you'd like
it.

---

## 13. Security changelog

Recent hardening on the `security/audit-and-hardening` branch:

| #   | Theme                                                 | Status                   |
| --- | ----------------------------------------------------- | ------------------------ |
| 1   | Origin check on CSRF; real OAuth consent screen       | Shipped                  |
| 2   | CI: drop `pull_request_target` auto-approve workflow  | Shipped                  |
| 3   | Bind Loki and the bot to localhost; encrypted backups | Shipped                  |
| 4   | Pin GitHub Actions by SHA                             | Shipped                  |
| 5   | CSP, HSTS preload, Permissions-Policy headers         | Shipped                  |
| 6   | Scope reconcile by user; validate cross-account FKs   | Shipped                  |
| 7a  | `withUser` transaction wrapper across all data access | Shipped (no-op refactor) |
| 7b  | Per-app DB roles + RLS migration                      | Pending                  |
| 8   | Hybrid client-side encryption for sensitive fields    | Roadmap                  |

Each entry is a single commit on the branch and is independently
revertable.
