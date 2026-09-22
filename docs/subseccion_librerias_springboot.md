## 6.3 Librerías y dependencias utilizadas

El backend generado es un proyecto **Maven** estándar sobre **Spring Boot 3.3.4**
y **Java 17**, heredando la gestión de versiones del `spring-boot-starter-parent`
(BOM que fija versiones compatibles entre todas las dependencias, evitando
conflictos manuales). Cada librería incluida responde a una necesidad concreta
de la arquitectura en cuatro capas; no se agregó ninguna dependencia superflua.

- **spring-boot-starter-web** — Expone la capa de controladores como una API
  REST. Incluye el servidor embebido **Tomcat**, el framework **Spring MVC** y
  la librería de serialización **Jackson**, permitiendo que el backend arranque
  de forma autónoma (`java -jar`) sin necesidad de desplegar en un servidor de
  aplicaciones externo.

- **spring-boot-starter-data-jpa** — Provee la capa de persistencia mediante
  **JPA (Jakarta Persistence API)** con **Hibernate** como implementación ORM.
  Es la librería que permite que cada `@Entity` del diagrama se mapee
  automáticamente a una tabla, y que los repositorios (`JpaRepository`) ofrezcan
  las operaciones CRUD sin escribir SQL.

- **postgresql** (`org.postgresql:postgresql`) — Driver **JDBC** de PostgreSQL.
  Es el puente entre Hibernate y la base de datos relacional; sin él, la
  aplicación no podría abrir conexiones al motor PostgreSQL configurado en
  `application.properties`.

- **spring-boot-starter-validation** — Integra **Jakarta Bean Validation**
  (Hibernate Validator). Habilita la validación declarativa de los datos que
  entran por los endpoints mediante anotaciones (`@NotNull`, `@Size`, etc.),
  reforzando la integridad de la información antes de persistirla.

- **jackson-datatype-hibernate6** (`com.fasterxml.jackson.datatype`) — Módulo
  de Jackson que resuelve un problema real detectado durante el desarrollo: la
  serialización a JSON de los **proxies perezosos (lazy) de Hibernate**. Sin
  este módulo, exponer entidades con relaciones perezosas por la API provocaría
  errores de serialización. Se registra junto con `@JsonIgnoreProperties` para
  evitar además la recursión infinita en relaciones bidireccionales.

- **springdoc-openapi-starter-webmvc-ui** (versión **2.6.0**) — Genera de forma
  automática la especificación **OpenAPI 3** de todos los controladores y sirve
  una interfaz **Swagger UI** navegable en `/swagger-ui.html`. Permite al
  evaluador (o a cualquier consumidor del backend) explorar y probar los
  endpoints desde el navegador sin herramientas externas, complementando las
  pruebas con Postman.

- **spring-boot-starter-test** (ámbito `test`) — Suite de pruebas que agrupa
  **JUnit 5**, **Mockito**, **AssertJ** y **Spring Test**. Queda disponible en
  el proyecto generado para que el desarrollador añada pruebas unitarias y de
  integración sobre la lógica de negocio de la capa de servicio.

- **spring-boot-maven-plugin** (plugin de build) — Empaqueta la aplicación como
  un **JAR ejecutable auto-contenido** (fat JAR) que incluye todas las
  dependencias y el servidor embebido, de modo que el backend se ejecuta con un
  único comando y es directamente contenedorizable con Docker.

En conjunto, estas dependencias materializan la arquitectura en capas
Controlador → Servicio → Repositorio → Entidad descrita en 6.1: `starter-web`
para la capa de exposición, `starter-data-jpa` + driver `postgresql` para la
persistencia, `starter-validation` y los módulos de Jackson para la integridad
y correcta serialización de los datos, y `springdoc-openapi` para la
documentación viva de la API. La selección se mantuvo deliberadamente mínima y
estándar para que el backend generado sea fácil de entender, extender y
defender.
