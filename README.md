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
| GET | `/api/countries` | `[{code, name}]` |
| GET | `/api/locations/lookup` | `?country=US&postalCode=90210` returns city/state (via zippopotam.us) |

Dojos have `state` and `postalCode`.

## Hosting

- **Frontend**: GitHub Pages via `.github/workflows/pages.yml` (repo Settings > Pages > Source: GitHub Actions). Set the repo variable `API_URL` to the public backend URL (no trailing slash).
- **Backend**: `Dockerfile` at the repo root; deploy to any container host (e.g. Render, Fly.io) with `DB_URL`, `DB_USER`, `DB_PASSWORD` (PostgreSQL) and `CORS_ORIGINS`-style property `app.cors-origins` (env `APP_CORS_ORIGINS=https://<user>.github.io`).

A practitioner can have many memberships, so they can belong to several dojos at once and have a history of past dojos.

## Edit approval
- Anyone can browse. Edits (create/update/delete) from non-admins are **not applied**; they are stored as pending changes (`change_request` table) and the API answers `202 Accepted`.
- Admins log in (`/#/login`, session cookie), see pending edits under **Review edits**, and **Approve** (the original request is replayed against the API) or **Reject** them. Admin edits apply immediately.
- Admins are managed under **Admins** (`/api/admin/users`).
- First start with no admins creates one: `ADMIN_USERNAME` (default `admin`) / `ADMIN_PASSWORD`. If the password is unset, a random one is printed once in the server log (`Created 'admin' with generated password`).
- Logins (success/failure), logouts, admin add/remove and password changes are written to `logs/audit.log` (path via `APP_AUDIT_LOG`; rolling, 365 days) with user, actor and IP. Passwords are never logged.
- Admins can have an email (set on the **Admins** page). When a non-admin edit is queued, every admin with an email is notified. Configure SMTP via env vars `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true`, plus optional `APP_MAIL_FROM` and `APP_PUBLIC_URL` (link in the email). Without `SPRING_MAIL_HOST` nothing is sent (a log line says so).
- Limitation: an edit that depends on a not-yet-approved record (e.g. a membership for a pending new person) fails on approval until the parent is approved.
