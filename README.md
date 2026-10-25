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
| GET | `/api/countries` | `[{code, name}]` |
| GET | `/api/locations/lookup` | `?country=US&postalCode=90210` returns city/state (via zippopotam.us) |

Dojos have `state` and `postalCode`.

## Hosting

- **Frontend**: GitHub Pages via `.github/workflows/pages.yml` (repo Settings > Pages > Source: GitHub Actions). Set the repo variable `API_URL` to the public backend URL (no trailing slash).
- **Backend**: `Dockerfile` at the repo root; deploy to any container host (e.g. Render, Fly.io) with `DB_URL`, `DB_USER`, `DB_PASSWORD` (PostgreSQL) and `CORS_ORIGINS`-style property `app.cors-origins` (env `APP_CORS_ORIGINS=https://<user>.github.io`).

A practitioner can have many memberships, so they can belong to several dojos at once and have a history of past dojos.
