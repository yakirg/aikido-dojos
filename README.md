# Aikido Dojos

Track aikido dojos worldwide and the practitioners who train there.

- `backend/` � Spring Boot 3 (Java 21, Gradle), Spring Data JPA, Flyway, REST API
- `frontend/` � React + Vite
- Database: H2 file DB by default (dev); PostgreSQL via `docker-compose.yml`

## Run

Backend (http://localhost:8090), uses H2 (`backend/data/`):

```
./gradlew :backend:bootRun
```

With PostgreSQL:

```
docker compose up -d
DB_URL=jdbc:postgresql://localhost:5432/dojos DB_USER=dojos DB_PASSWORD=dojos ./gradlew :backend:bootRun
```

Frontend (http://localhost:5173, proxies `/api` to the backend):

```
cd frontend
npm install
npm start
```

## Test

```
./gradlew test
cd frontend && npm test
```

## API

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/dojos` | `?q=` searches name/city/country |
| GET/PUT/DELETE | `/api/dojos/{id}` | delete returns 409 if the dojo has practitioners |
| GET/POST | `/api/practitioners` | `?q=` searches name/email, `?dojoId=` filters (any past or current membership) |
| GET/PUT/DELETE | `/api/practitioners/{id}` | response includes the practitioner's memberships |
| GET | `/api/dojos/{id}/memberships` | members of a dojo, past and present |
| POST | `/api/practitioners/{id}/memberships` | body: `dojoId`, `startDate`, `endDate` (null = current) |
| PUT/DELETE | `/api/memberships/{id}` | edit or remove a membership |
| GET/POST | `/api/dojos/{id}/leaders` | dojo leaders with tenure; body: `practitionerId`, `startDate`, `endDate` (null = current), `founder` (founders are the first leaders) |
| PUT/DELETE | `/api/leaders/{id}` | edit or remove a leader |
| GET/POST | `/api/dojos/{id}/locations` | dojo location history; body: `address`, `city`, `state`, `postalCode`, `country`, `startDate`, `endDate` (null = current). The dojo's own address fields mirror its current location |
| PUT/DELETE | `/api/locations/{id}` | edit or remove a location |
| GET | `/api/countries` | `[{code, name}]` |
| GET | `/api/locations/lookup` | `?country=US&postalCode=90210` returns city/state (via zippopotam.us) |

Dojos have `state` and `postalCode`.

## Hosting

- **Frontend**: GitHub Pages via `.github/workflows/pages.yml` (repo Settings > Pages > Source: GitHub Actions). Set the repo variable `API_URL` to the public backend URL (no trailing slash).
- **Backend**: `Dockerfile` at the repo root; deploy to any container host (e.g. Render, Fly.io) with `DB_URL`, `DB_USER`, `DB_PASSWORD` (PostgreSQL) and `CORS_ORIGINS`-style property `app.cors-origins` (env `APP_CORS_ORIGINS=https://<user>.github.io`).

A practitioner can have many memberships, so they can belong to several dojos at once and have a history of past dojos.

## Run as a local service (Docker, WSL2)

Stack: PostgreSQL + the app (Spring Boot serving the built React UI) on `127.0.0.1:8090`. Named volumes `pgdata` (database) and `applogs` (audit log). Both services use `restart: unless-stopped` and healthchecks.

```
cp .env.example .env     # set POSTGRES_PASSWORD (and ADMIN_PASSWORD)
docker compose up -d --build
docker compose ps        # both "healthy"
```

Open http://localhost:8090. The existing `Caddyfile` / `run-caddy.ps1` keep working unchanged (they proxy to `localhost:8090`; WSL2 forwards localhost to Windows). Stop the Windows `AikidoDojos` service first to free port 8090 (or set `APP_PORT` in `.env`).

**Start at boot (WSL2):**
1. `/etc/wsl.conf` must contain `[boot]` / `systemd=true` (then `wsl --shutdown` once).
2. In WSL: `sudo systemctl enable docker` (Docker Engine). Containers with `restart: unless-stopped` come back with the daemon. With Docker Desktop, enable "Start Docker Desktop when you sign in".
3. WSL only starts when something uses it. Create a Windows scheduled task at logon (or boot, as SYSTEM) running `wsl -d Ubuntu -u root -- sleep infinity`, e.g. `schtasks /create /tn WSLKeepAlive /sc onlogon /tr "wsl -d Ubuntu -u root -- sleep infinity"`.

**Migrate existing H2 data into PostgreSQL** (run in the repo root; the app must have started once so Flyway created the schema):
```
# 1. dump the H2 file DB (stop the Windows service first); h2 jar is in ~/.gradle caches
java -cp <h2.jar> org.h2.tools.Script -url "jdbc:h2:file:./data/dojos" -user sa -script dump.sql -options NOPASSWORDS NOSETTINGS
# 2. keep only data rows, drop Flyway history
findstr /B "INSERT INTO" dump.sql | findstr /V flyway_schema_history > data.sql
# 3. load (stop app so nothing writes), then fix sequences/identity if tables use them
docker compose stop app
docker compose exec -T db psql -U dojos -d dojos -c "TRUNCATE dojo, practitioner CASCADE" 
docker compose exec -T db psql -U dojos -d dojos -v ON_ERROR_STOP=1 < data.sql
docker compose start app
```
Table names in `INSERT INTO PUBLIC."X"` may need lower-casing/unquoting (`sed -e 's/PUBLIC\.//' -e 's/"//g'`). Verify counts in the UI. If a table uses identity ids, reset with `SELECT setval(pg_get_serial_sequence('<table>','id'), (SELECT max(id) FROM <table>));`.

**Backup / restore:**
```
mkdir -p backups
docker compose exec -T db pg_dump -U dojos dojos | gzip > backups/dojos-$(date +%F).sql.gz     # cron daily
gunzip -c backups/dojos-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U dojos -d dojos   # restore into an empty DB
```
Also copy the audit log: `docker compose cp app:/app/logs/audit.log backups/`.

**Update:** `git pull && docker compose up -d --build` (Flyway applies new migrations on start). Logs: `docker compose logs -f app`.

## Edit approval
- Anyone can browse. Edits (create/update/delete) from non-admins are **not applied**; they are stored as pending changes (`change_request` table) and the API answers `202 Accepted`.
- Admins log in (`/#/login`, session cookie), see pending edits under **Review edits**, and **Approve** (the original request is replayed against the API) or **Reject** them. Admin edits apply immediately.
- Admins are managed under **Admins** (`/api/admin/users`).
- First start with no admins creates one: `ADMIN_USERNAME` (default `admin`) / `ADMIN_PASSWORD`. If the password is unset, a random one is printed once in the server log (`Created 'admin' with generated password`).
- Logins (success/failure), logouts, admin add/remove and password changes are written to `logs/audit.log` (path via `APP_AUDIT_LOG`; single append-only file, never rotated or deleted) with user, actor and IP. Passwords are never logged.
- Admins can have an email (set on the **Admins** page). When a non-admin edit is queued, every admin with an email is notified. Configure SMTP via env vars `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true`, plus optional `APP_MAIL_FROM` and `APP_PUBLIC_URL` (link in the email). Without `SPRING_MAIL_HOST` nothing is sent (a log line says so).
- Limitation: an edit that depends on a not-yet-approved record (e.g. a membership for a pending new person) fails on approval until the parent is approved.
