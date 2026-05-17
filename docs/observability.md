# Observability

## Overview

Nexo uses structured JSON logging with correlation IDs, shipped to Loki and queried via Grafana. The admin app provides a built-in log viewer for real-time container monitoring.

---

## Stack

```
App (pino JSON to stdout) → Docker Loki log driver → Loki → Grafana
```

| Component      | Role                          | Access                          |
| -------------- | ----------------------------- | ------------------------------- |
| `@nexo/logger` | Structured JSON logger (pino) | Used by all apps                |
| Loki           | Log aggregation               | `localhost:3100` (local)        |
| Grafana        | Log querying & dashboards     | `grafana.krieger2501.de` (prod) |
| Admin app      | Live log viewer               | `admin.krieger2501.de/services` |

---

## Structured logging with @nexo/logger

Each app imports the shared logger:

```typescript
import { createLogger } from '@nexo/logger';

const logger = createLogger('finance');
logger.info({ userId, action: 'expense.create' }, 'Created expense');
```

Every log line is JSON with standard fields:

- `level` — log level (info, warn, error)
- `time` — ISO timestamp
- `service` — which app emitted it
- `correlationId` — request trace ID (propagated via `x-correlation-id` header)
- `msg` — human-readable message
- Plus any structured fields passed in the first argument

---

## Correlation IDs

Each incoming HTTP request gets a correlation ID:

1. If the request has an `x-correlation-id` header, use it (propagation from other services)
2. Otherwise, generate a new UUID

The correlation ID is:

- Attached to all log lines for that request
- Passed to downstream service calls (auth API)
- Included in error responses sent to the client
- Displayed in the admin app's error toast (users can copy and report it)

---

## Docker logging configuration

In `docker-compose.yml`, all app services use the Loki log driver:

```yaml
auth:
  logging:
    driver: loki
    options:
      loki-url: 'http://localhost:3100/loki/api/v1/push'
      labels: 'service'
```

This ships container stdout directly to Loki with service labels for filtering.

---

## Loki configuration

Config lives in `loki/local-config.yaml`. Default retention: 7 days. Storage: local filesystem on the VPS.

---

## Grafana

Provisioning files in `grafana/`:

- `datasources/` — pre-configures Loki as a datasource
- `dashboards/` — optional pre-built dashboard definitions

Access:

- **Local:** `http://localhost:3100` (after `pnpm docker:observe`)
- **Production:** `grafana.krieger2501.de` (behind Caddy, server profile only)

Default credentials: `admin` / value of `GRAFANA_PASSWORD` env var.

---

## Admin app log viewer

The admin app's Services panel (`/services/[name]`) includes a built-in log viewer that:

- Queries Loki directly for the selected container's logs
- Supports real-time streaming (tail mode)
- Provides a dynamic field selector to show/hide JSON fields
- Highlights errors and warnings
- Expandable rows show full JSON detail

---

## Local development

Logs go to stdout in dev mode (pretty-printed by pino). To view them in Grafana locally:

```bash
pnpm docker:observe       # start Loki + Grafana
pnpm docker:observe:down  # stop
```

---

## Querying logs

### Grafana (LogQL)

```logql
{service="finance"} | json | level="error"
{service="auth"} | json | correlationId="abc-123"
{service=~"finance|auth"} | json | line_format "{{.msg}}"
```

### Admin app

Navigate to Services → select a container → Logs tab. Use the field picker to customize which JSON fields are displayed.
