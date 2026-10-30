# syntax=docker/dockerfile:1

# ---- build: JDK + Maven wrapper, nada disso vai para a imagem final ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /build

# Camada de dependências: só refaz quando o pom muda.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw -q -B dependency:go-offline

COPY src src
RUN ./mvnw -q -B -DskipTests package \
    && mv target/contas-claras-*.jar target/app.jar

# ---- runtime: só JRE (Alpine, imagem menor = pull mais rápido no cold start) e o jar, sem root ----
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S -G app -H app
WORKDIR /app
COPY --from=build --chown=app:app /build/target/app.jar app.jar
USER app

# Container pequeno e de partida rápida (serverless): heap proporcional à memória do container,
# GC serial (sem threads extras) e só o compilador C1 (começa a rodar mais cedo, pico menor).
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1"

# A porta real vem de $PORT (server.port=${PORT:8080} no application.yml); 8080 é o padrão.
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
