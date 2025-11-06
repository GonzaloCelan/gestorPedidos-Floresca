# Etapa de build: compila el proyecto con Maven
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app

# Copiamos el descriptor de dependencias y descargamos todo
COPY pom.xml .
RUN mvn -q -e -U -DskipTests dependency:go-offline

# Copiamos el código fuente y construimos el JAR
COPY src ./src
RUN mvn -q -DskipTests package

# Etapa de runtime: imagen liviana solo con el JAR
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copiamos el artefacto generado desde la etapa anterior
COPY --from=build /app/target/*.jar app.jar

# Railway inyecta la variable PORT, la usamos para que Spring escuche ahí
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java","-Dserver.port=${PORT}","-jar","/app/app.jar"]
