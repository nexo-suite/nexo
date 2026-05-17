# Access Management

## How access works

Two levels of control:

1. **Can this person sign in at all?** → `auth.allowed_emails` table
2. **Which apps can they use?** → `auth.user_app_access` table

Both are managed via the **Admin app** (Users tab) or directly in the database.

---

## Whitelisting a new user

### Via Admin app (recommended)

1. Open `admin.krieger2501.de` → Users tab
2. Click "Invite" and enter their email
3. Optionally grant app access (finance, admin, etc.)

### Via database

Insert their email before they try to sign in:

```bash
# Local
docker exec -it nexo-postgres-1 psql -U nexo -d nexo \
  -c "INSERT INTO auth.allowed_emails (email) VALUES ('friend@example.com');"

# Production
docker compose exec postgres psql -U nexo -d nexo \
  -c "INSERT INTO auth.allowed_emails (email) VALUES ('friend@example.com');"
```

They can sign in with **any OAuth provider** (Google, GitHub, or Discord) as long as the account's email matches. The provider doesn't matter — only the email does.

---

## Per-app access

The `auth.user_app_access` table controls which apps each user can open. The auth server checks this table during the OAuth flow and redirects unauthorized users to `/not-authorized-app`.

### Granting access

Via Admin app: Users tab → select user → toggle app access checkboxes.

Via SQL:

```sql
-- Grant access to finance
INSERT INTO auth.user_app_access (user_id, app)
SELECT id, 'finance' FROM auth."user" WHERE email = 'friend@example.com';

-- Grant access to multiple apps
INSERT INTO auth.user_app_access (user_id, app)
SELECT id, unnest(ARRAY['finance', 'admin'])
FROM auth."user" WHERE email = 'friend@example.com';
```

### Revoking access

```sql
DELETE FROM auth.user_app_access
WHERE user_id = (SELECT id FROM auth."user" WHERE email = 'friend@example.com')
  AND app = 'admin';
```

### Available app identifiers

| App ID    | App             |
| --------- | --------------- |
| `finance` | Finance tracker |
| `admin`   | Admin panel     |
| `gym`     | Gym (planned)   |

---

## Removing a user entirely

```sql
-- Revoke sign-in ability
DELETE FROM auth.allowed_emails WHERE email = 'friend@example.com';

-- Their existing sessions will expire naturally.
-- To revoke immediately, also delete their sessions:
DELETE FROM auth.session
WHERE user_id = (SELECT id FROM auth."user" WHERE email = 'friend@example.com');
```

---

## Viewing current users

```sql
SELECT
  u.email,
  u.name,
  u.created_at,
  ae.email IS NOT NULL AS is_allowed,
  array_agg(ua.app) FILTER (WHERE ua.app IS NOT NULL) AS apps
FROM auth."user" u
LEFT JOIN auth.allowed_emails ae ON ae.email = u.email
LEFT JOIN auth.user_app_access ua ON ua.user_id = u.id
GROUP BY u.id, u.email, u.name, u.created_at, ae.email
ORDER BY u.created_at;
```

Or just use the Admin app — the Users tab shows all this information with a UI for managing it.

---

## User preferences

Global user preferences (language, theme, birthday) are stored in `auth.user_preferences`. These apply across all apps and are separate from app-specific settings like currency or week start day.

```sql
SELECT * FROM auth.user_preferences;
```

The `language` field controls i18n: `'auto'` (detect from browser), `'en'`, `'de'`, or `'tr'`.
