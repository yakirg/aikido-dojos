# Aikido Dojos

Track aikido dojos worldwide and the practitioners who train there.

- `backend/` – Spring Boot 3 (Java 21), Spring Data JPA, Flyway, REST API
- `frontend/` – React + Vite
- Database: H2 file DB by default (dev); PostgreSQL via `docker-compose.yml`

## Run

Backend (http://localhost:8080), uses H2 (`backend/data/`):

```
cd backend
./mvnw spring-boot:run
```

With PostgreSQL:

```
docker compose up -d
cd backend
DB_URL=jdbc:postgresql://localhost:5432/dojos DB_USER=dojos DB_PASSWORD=dojos ./mvnw spring-boot:run
```

Frontend (http://localhost:5173, proxies `/api` to the backend):

```
cd frontend
npm install
npm run dev
```

## Test

```
cd backend && ./mvnw test
cd frontend && npm test
```

## API

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/dojos` | `?q=` searches name/city/country |
| GET/PUT/DELETE | `/api/dojos/{id}` | delete returns 409 if the dojo has practitioners |
| GET/POST | `/api/practitioners` | `?q=` searches name/email, `?dojoId=` filters |
| GET/PUT/DELETE | `/api/practitioners/{id}` | `dojoId` in the body links to a dojo (null unlinks) |
