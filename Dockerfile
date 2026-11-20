FROM node:20-alpine AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle ./
COPY gradle gradle
COPY backend backend
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew \
    && ./gradlew --no-daemon :backend:bootJar -x test \
    && cp backend/build/libs/backend-*-SNAPSHOT.jar /app.jar

FROM eclipse-temurin:21-jre
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --home-dir /app app && mkdir -p /app/logs && chown app:app /app/logs
WORKDIR /app
COPY --from=build /app.jar app.jar
COPY --from=frontend /src/frontend/dist /app/frontend-dist
ENV FRONTEND_DIST=/app/frontend-dist/
USER app
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:8090/api/countries > /dev/null || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
