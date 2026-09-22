export function renderPomXml(artifactId: string, groupId: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.4</version>
        <relativePath/>
    </parent>

    <groupId>${groupId}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>${artifactId}</name>
    <description>Backend generado por la herramienta CASE</description>

    <properties>
        <java.version>17</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.datatype</groupId>
            <artifactId>jackson-datatype-hibernate6</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.6.0</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
`;
}

export function renderApplicationProperties(dbName: string): string {
  const cleanDb = sanitizeDatabaseName(dbName);
  return `spring.application.name=${cleanDb}
spring.datasource.url=jdbc:postgresql://localhost:5432/${cleanDb}
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
server.port=8080

# Inicializacion de datos de prueba automaticos (data.sql)
spring.sql.init.mode=always
spring.jpa.defer-datasource-initialization=true

# Swagger / OpenAPI
springdoc.api-docs.path=/v3/api-docs
springdoc.swagger-ui.path=/swagger-ui.html
springdoc.swagger-ui.operations-sorter=method
`;
}

export function renderApplicationClass(
  packageName: string,
  className: string,
): string {
  return `package ${packageName};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${className} {

    public static void main(String[] args) {
        SpringApplication.run(${className}.class, args);
    }
}
`;
}

export function renderDockerCompose(projectName: string): string {
  const cleanDb = sanitizeDatabaseName(projectName);
  return `version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: ${cleanDb}-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${cleanDb}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ${cleanDb}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: .
    container_name: ${cleanDb}-backend
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${cleanDb}
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
`;
}

export function renderDockerfile(): string {
  return `# Etapa 1: Build
FROM maven:3.9.8-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
`;
}

export function renderProjectReadme(
  projectName: string,
  endpoints: string[],
): string {
  const cleanDb = sanitizeDatabaseName(projectName);
  const endpointList =
    endpoints.length > 0
      ? endpoints
          .map(
            (ep) =>
              `- \`/api/${ep}\` (CRUD: GET, GET /{id}, POST, PUT /{id}, DELETE /{id})`,
          )
          .join('\n')
      : '- Sin entidades declaradas';

  return `# 🚀 ${projectName} - Backend Spring Boot

Backend generado automáticamente por la **Herramienta CASE Colaborativa** con arquitectura de 4 capas:
- **Entity** (JPA + Hibernate)
- **Repository** (Spring Data JPA)
- **Service** (Lógica de negocio y transaccionalidad)
- **Controller** (Endpoints RESTful con CORS habilitado)

---

## 📋 Requisitos
- **Java 17+** y **Maven 3.8+**
- O alternativamente **Docker & Docker Compose**

---

## 🗄️ Opción A: Iniciar con Docker Compose (Recomendado)

Inicia PostgreSQL y compila el backend en un solo paso:
\`\`\`bash
docker compose up --build
\`\`\`

O si prefieres ejecutar solo la base de datos en Docker y correr el backend en tu IDE (IntelliJ / VS Code / Eclipse):
\`\`\`bash
docker compose up -d postgres
\`\`\`

---

## 💻 Opción B: Ejecutar con Maven local

1. Asegúrate de tener PostgreSQL corriendo en el puerto 5432 con la base de datos \`${cleanDb}\`.
2. En la raíz del proyecto:
\`\`\`bash
mvn spring-boot:run
\`\`\`

---

## 📚 Documentación Interactiva (Swagger UI)

Una vez iniciado el backend, ingresa desde tu navegador a:
👉 **http://localhost:8080/swagger-ui.html**

Aquí podrás:
1. Ver todos los endpoints clasificados por clase UML.
2. Probar peticiones **GET, POST, PUT, DELETE** interactivamente con ejemplos.
3. Descargar el esquema OpenAPI en \`http://localhost:8080/v3/api-docs\`.

---

## 📡 Endpoints REST Generados

${endpointList}
`;
}

function sanitizeDatabaseName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '') || 'appdb'
  );
}
