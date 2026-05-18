# Deployment

## Infrastructure

- **VPS:** IONOS L+ (6 vCore, 8 GB RAM, 240 GB NVMe SSD)
- **OS:** Ubuntu 24.04 LTS
- **Domain:** `krieger2501.de` (and `*.krieger2501.de` subdomains)
- **Stack:** Docker Compose, Caddy (auto TLS), PostgreSQL 17, Loki + Grafana

---

## Initial server setup (one-time)

SSH in as root:

```bash
# Create a non-root user
adduser nexo
usermod -aG sudo nexo

# Harden SSH — paste your public key first
mkdir -p /home/nexo/.ssh
cat >> /home/nexo/.ssh/authorized_keys << 'EOF'
ssh-ed25519 AAAA... your-public-key
EOF
chmod 700 /home/nexo/.ssh
chmod 600 /home/nexo/.ssh/authorized_keys
chown -R nexo:nexo /home/nexo/.ssh

# Disable root login and password auth
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
systemctl restart ssh

# Firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status

# Switch to the new user for everything below
su - nexo
```

---

## Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker -v   # verify
```

---

## Point DNS

In the IONOS domain control panel, add A records for each subdomain:

| Hostname                 | Type | Value      |
| ------------------------ | ---- | ---------- |
| `krieger2501.de`         | A    | `<VPS IP>` |
| `auth.krieger2501.de`    | A    | `<VPS IP>` |
| `finance.krieger2501.de` | A    | `<VPS IP>` |
| `admin.krieger2501.de`   | A    | `<VPS IP>` |
| `grafana.krieger2501.de` | A    | `<VPS IP>` |

Wait for propagation before continuing (5–30 min). Verify:

```bash
dig +short auth.krieger2501.de   # should return your VPS IP
```

Caddy will fail to obtain TLS certificates if DNS isn't pointing at the server yet.

---

## Update OAuth redirect URIs

In each provider's developer console, **add** the production URI alongside the localhost one you added during development. Do not remove the localhost entries.

| Provider | Production redirect URI                                 |
| -------- | ------------------------------------------------------- |
| Google   | `https://auth.krieger2501.de/api/auth/callback/google`  |
| GitHub   | `https://auth.krieger2501.de/api/auth/callback/github`  |
| Discord  | `https://auth.krieger2501.de/api/auth/callback/discord` |

OAuth credentials are only registered against the **auth** app — admin and finance authenticate through the auth server, so no additional redirect URIs are needed for them.

---

## Clone and configure

```bash
cd ~
git clone https://github.com/krieger2501/nexo
cd nexo
cp .env.example .env
nano .env
```

Generate strong secrets:

```bash
openssl rand -hex 32   # for BETTER_AUTH_SECRET
```

Fill in `.env`:

```bash
POSTGRES_PASSWORD=<strong password>
DATABASE_URL=postgres://nexo:<POSTGRES_PASSWORD>@postgres:5432/nexo
BETTER_AUTH_SECRET=<openssl output>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

---

## Deploy

### Via CI/CD (normal path)

Production deployments are fully automated via GitHub Actions. No manual SSH required.

1. Merge your changes into `main`
2. release-please opens (or updates) a release PR with the version bump and changelog
3. Merge the release PR — this pushes a `nexo-v*` tag
4. The `Deploy Production` workflow triggers, SSHes into the VPS, and runs:
   ```bash
   git pull origin main
   docker compose --profile production --profile server --env-file .env up -d --build
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   docker compose --profile preview --env-file .env.preview up -d --build
   ```
5. All services rebuild with the new images. The preview environment is also redeployed against `main`.

Monitor the run in the [Actions tab](https://github.com/krieger2501/nexo/actions).

### Manual deployment (emergency / first-time)

SSH into the VPS and run directly:

```bash
cd ~/nexo
git pull origin main
docker compose --profile production --profile server --env-file .env up -d --build
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

This will:

1. Build all Docker images
2. Start PostgreSQL
3. Run migrations (waits for Postgres to be healthy)
4. Start auth, admin, finance, landing
5. Start Caddy, bot, Loki, and Grafana (server profile)
6. Caddy issues Let's Encrypt certificates automatically
7. All app logs ship to Loki via the Docker Loki log driver

Monitor startup:

```bash
docker compose logs -f              # all services
docker compose logs -f caddy        # watch for TLS cert issuance
docker compose logs -f migrate      # confirm migrations ran
docker compose ps                   # check all services are Up
```

---

## Seed your email

```bash
docker compose exec postgres psql -U nexo -d nexo \
  -c "INSERT INTO auth.allowed_emails (email) VALUES ('your@email.com');"
```

Open `https://auth.krieger2501.de/login` and sign in. That's your admin account.

---

## Updating after a push

The normal path is CI/CD — merge to main and let release-please handle it (see Deploy above).

To rebuild a single service without a full release (emergency hotfix):

```bash
cd ~/nexo
git pull origin main
docker compose --profile production --env-file .env up -d --build finance
```

---

## Backups

Backups must be encrypted at rest. The DB contains financial data and Better
Auth access/refresh tokens — a leaked plaintext dump is game-over for the
trust model. We use [`age`](https://github.com/FiloSottile/age) with a
public-key recipient; the matching private key lives **off the VPS** (laptop
plus a paper backup), so a VPS compromise alone cannot decrypt past dumps.

### One-time setup

On your laptop (not the VPS):

```bash
brew install age
age-keygen -o ~/nexo-backup.age
# Prints: Public key: age1...    ← copy this
# Move ~/nexo-backup.age to a password manager + write the private key on
# paper. If you lose this key, all backups become unrecoverable.
```

On the VPS:

```bash
sudo apt install age
sudo mkdir -p /backups
sudo chown nexo:nexo /backups

# Store ONLY the public key on the VPS — no private material.
echo 'age1<your-public-key>' | sudo tee /etc/nexo/backup.recipient
```

### Nightly cron

```
crontab -e
```

```
0 3 * * * docker compose --profile production exec -T postgres pg_dump -U nexo nexo | gzip | age -R /etc/nexo/backup.recipient > /backups/nexo-$(date +\%Y\%m\%d).sql.gz.age
```

### Restoring from a backup

On the laptop with the private key (do not copy the key to the VPS):

```bash
age -d -i ~/nexo-backup.age /backups/nexo-20260501.sql.gz.age | \
  gunzip | \
  docker compose exec -T postgres psql -U nexo -d nexo
```

### Offsite copies

Sync the encrypted `.age` files to B2 — never the raw dumps:

```bash
sudo apt install rclone
rclone config   # configure a B2 remote

# In crontab, after the pg_dump line:
30 3 * * * rclone sync --include '*.age' /backups b2:your-bucket-name/nexo-backups
```

### Key rotation

Rotate the age key once a year, or immediately if the laptop is lost or you
suspect compromise:

1. Generate a new key on the laptop.
2. Replace `/etc/nexo/backup.recipient` on the VPS.
3. Keep the old private key archived offline so historical backups stay
   restorable until you decide to retire them.
4. Re-encrypt the most recent few dumps to the new recipient if you want a
   clean cut-over.

---

## Useful commands on the server

```bash
# View logs for a specific service
docker compose logs -f auth

# Open a Postgres shell
docker compose exec postgres psql -U nexo -d nexo

# Restart a single service
docker compose restart finance

# Stop everything (production + server profiles)
docker compose --profile production --profile server down

# Stop and remove volumes (DESTRUCTIVE — wipes the database)
docker compose --profile production --profile server down -v
```

---

## When adding a new app

1. Add the service to `docker-compose.yml` with `profiles: [production]` (and a `_preview` variant with `profiles: [preview]`)
2. Add the subdomain to `Caddyfile`
3. Add the DNS A records in IONOS (production + `*.preview` subdomain)
4. Add the OAuth redirect URI in each provider's console
5. Let CI/CD deploy on next release, or run manually: `docker compose --profile production --profile server --env-file .env up -d --build`

See [Adding a New App](adding-an-app.md) for the full checklist.
