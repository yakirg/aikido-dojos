FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN ./gradlew --no-daemon :backend:bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/backend/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
