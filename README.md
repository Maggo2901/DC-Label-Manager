# DC Label Platform

Open-source datacenter label manager.
Features:
- Serial / Cable Labels (Layout A/B/C)
- Template Library


## Requirements
- Node.js 20+
- npm 10+

## Install
```bash
npm install
```

## Access Protection (Optional)

You can protect the application with Basic Auth and IP Allowlisting.

1.  **Generate Password File**:
    ```bash
    mkdir -p secrets
    htpasswd -c secrets/nginx.htpasswd myuser
    ```
2.  **Enable Auth**:
    Edit `docker-compose.yml` and set `AUTH_ENABLED=true`.

3.  **IP Allowlist**:
    Set `ALLOWLIST_ENABLED=true` and configure `ALLOWLIST_IPS` (comma-separated).

## Development
```bash
npm run dev
```
This starts backend and frontend in parallel.

Local development ports:
- Backend: `http://localhost:3000`
- Frontend (Vite): `http://localhost:5173` (or next free port)
- Vite dev proxy: `/api` -> `http://localhost:3000`

## Build
```bash
npm run build
```

## Production Start
```bash
npm run start
```

## Portainer Deployment
In Portainer:
1. Go to `Stacks`.
2. Choose `Deploy from Git repository`.
3. Repository URL: `https://github.com/Maggo2901/DC-Label-Manager`
4. Compose path: `docker-compose.yml`

`docker-compose.yml` is self-contained and includes inline backend environment variables for Git-based Portainer deployment.

## Deployment Modes
- Docker Compose deployment:
  Use `docker-compose.yml` directly. Compatible with Docker Compose and Podman Compose.
- Portainer Git deployment:
  Use `docker-compose.yml` from Git. It does not require `.env.production` because backend environment variables are defined inline.

## Environment
Copy `.env.example` and adjust values for your environment:
- `HOST`, `PORT`, `CORS_ORIGIN`, `JSON_LIMIT`
- `VITE_API_BASE_URL` (optional; empty keeps same-origin API requests)
- `VITE_DEV_API_TARGET` (optional; Vite dev proxy target)

`CORS_ORIGIN` supports a comma-separated list (for example `https://app.company.com,https://admin.company.com`).
If `CORS_ORIGIN` is empty, all origins are allowed.
In non-production mode, local Vite origins matching `http://localhost:<port>` and `http://127.0.0.1:<port>` are additionally allowed when `CORS_ORIGIN` is set.

## Production Port Mapping
- Backend container port: `3000`
- Frontend container port: `80`
- Frontend host mapping: `9020:80`
- Nginx API upstream: `http://backend:3000`

After backend restarts, `/api` requests may briefly return `502` until the upstream is reachable again.

## Module Routes
Backend API prefixes:
- `/api/health`
- `/api/cable`
- `/api/templates`
- `/api/template-library`
- `/api/logistics`
- `/api/ptouch`
- `/api/tools`
- `/api/draft`
- `/api/history`
- `/api/print-history`
- `/api/doc-templates`

## Testing

```bash
npm test              # Run all tests once
npm run test:watch    # Run in watch mode
```

Tests cover the shared schema engine (all 4 layouts) with snapshot drift detection.

## Backup & Restore

### Create a Backup

```bash
npm run backup                    # Backs up to ./backups/
npm run backup /mnt/nas/backups   # Backs up to custom path
```

This creates a timestamped `.tar.gz` archive containing:
- `app.db` — SQLite database (print history, templates, drafts, audit log)
- `doc-templates/` — Uploaded document template files

The backup uses SQLite-safe copying and works while the server is running.

### Restore from Backup

1. Stop the running containers:
   ```bash
   docker compose down
   ```

2. Extract the backup archive:
   ```bash
   tar -xzf dc-label-backup_2026-02-20_11-22-48.tar.gz
   ```

3. Replace the database file in the Docker volume:
   ```bash
   # Find the volume mount path
   docker volume inspect dc-label-manager_backend-storage

   # Copy files into the volume (adjust path from inspect output)
   sudo cp dc-label-backup_*/app.db /var/lib/docker/volumes/dc-label-manager_backend-storage/_data/
   sudo cp -r dc-label-backup_*/doc-templates/ /var/lib/docker/volumes/dc-label-manager_backend-storage/_data/
   ```

   For local development (no Docker):
   ```bash
   cp dc-label-backup_*/app.db backend/storage/app.db
   cp -r dc-label-backup_*/doc-templates/ backend/storage/
   ```

4. Restart the containers:
   ```bash
   docker compose up -d
   ```

5. Verify the restore via healthcheck:
   ```bash
   curl http://localhost:9020/api/health
   # Expected: {"status":"healthy","checks":{"db":true,"disk":true}}
   ```

### Backup Schedule Recommendation
For production use, schedule regular backups via cron:
```bash
# Daily backup at 02:00, keep last 30 days
0 2 * * * cd /path/to/DC-Label-Manager && node scripts/backup.js /mnt/backups && find /mnt/backups -name "dc-label-backup_*.tar.gz" -mtime +30 -delete
```

## Healthcheck

The `/api/health` endpoint verifies:
- **DB connectivity** — executes a probe query against SQLite
- **Disk access** — writes and removes a temporary file in the storage directory

| State | HTTP | Meaning |
|-------|------|---------|
| `healthy` | 200 | All checks pass |
| `degraded` | 503 | DB or disk check failed |
| `unhealthy` | 503 | Both checks failed |

Docker `HEALTHCHECK` is configured to restart the container on persistent failures.

## Architecture Overview
Backend:
- `backend/app`: runtime bootstrap, config, logger, shared HTTP middleware/utilities
- `backend/modules`: feature modules (`cable`, `templates`, `template-library`, `logistics`, `ptouch`, `tools`, `doc-templates`, `health`)
- `backend/history` / `backend/drafts`: history tracking and draft persistence
- `backend/storage`: persistent runtime files (DB, uploaded doc-templates)

Frontend:
- `frontend/src/modules`: feature UI modules (`cable`, `history`, `logistics`, `PtouchLabelBuilder`, `settings`, `template-library`, `tools`)
- `frontend/src/shared/api`: centralized API client and platform API wrappers
- `frontend/src/shared/labels`: label schema bridge layer and layout dimensions
- `frontend/src/shared/utils`: shared browser utilities (blob download/print)

Shared:
- `shared/labelSchemas`: single source of truth for label layout schemas and computation engine, consumed by both backend (dynamic ESM import) and frontend (Vite alias `@labelSchemas`)
