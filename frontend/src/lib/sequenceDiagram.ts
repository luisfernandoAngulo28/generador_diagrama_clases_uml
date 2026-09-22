import type { UmlAttribute, UmlRelation } from '../types/uml';

export type SequenceOperation = 'CREATE' | 'GET_BY_ID' | 'LIST' | 'UPDATE' | 'DELETE';

export interface SequenceStep {
  id: number;
  from: string;
  to: string;
  message: string;
  returnMessage?: string;
  description: string;
  type: 'sync' | 'return' | 'db';
}

export function getSequenceSteps(
  className: string,
  operation: SequenceOperation,
  _relations: UmlRelation[] = [],
): SequenceStep[] {
  const lower = className.toLowerCase();
  const plural = lower.endsWith('s') ? lower : `${lower}s`;

  switch (operation) {
    case 'CREATE':
      return [
        {
          id: 1,
          from: 'Usuario / App Móvil',
          to: `${className}Controller`,
          message: `POST /api/${plural} (${className}DTO)`,
          description: 'El cliente HTTP envía el JSON para registrar una nueva entidad.',
          type: 'sync',
        },
        {
          id: 2,
          from: `${className}Controller`,
          to: `${className}Service`,
          message: `create${className}(dto)`,
          description: 'El controlador valida anotaciones @Valid y delega a la capa de negocio.',
          type: 'sync',
        },
        {
          id: 3,
          from: `${className}Service`,
          to: `${className}Repository`,
          message: `save(entity)`,
          description: 'El servicio mapea el DTO a Entidad JPA y llama al repositorio Spring Data.',
          type: 'sync',
        },
        {
          id: 4,
          from: `${className}Repository`,
          to: 'Base de Datos (PostgreSQL)',
          message: `INSERT INTO ${lower} (...) VALUES (...)`,
          description: 'Hibernate ejecuta la sentencia INSERT SQL generando el ID autoincremental.',
          type: 'db',
        },
        {
          id: 5,
          from: 'Base de Datos (PostgreSQL)',
          to: `${className}Repository`,
          message: 'Row inserted (ID, Timestamp)',
          description: 'La base de datos confirma el registro y devuelve las claves generadas.',
          type: 'return',
        },
        {
          id: 6,
          from: `${className}Repository`,
          to: `${className}Service`,
          message: `retorna entidad persistida`,
          description: 'Spring Data JPA retorna la instancia con estado persistente.',
          type: 'return',
        },
        {
          id: 7,
          from: `${className}Service`,
          to: `${className}Controller`,
          message: `retorna ${className}DTO`,
          description: 'El servicio convierte la entidad a DTO de respuesta.',
          type: 'return',
        },
        {
          id: 8,
          from: `${className}Controller`,
          to: 'Usuario / App Móvil',
          message: 'HTTP 201 Created + JSON',
          description: 'El controlador retorna respuesta HTTP 201 Created con el payload JSON.',
          type: 'return',
        },
      ];

    case 'GET_BY_ID':
      return [
        {
          id: 1,
          from: 'Usuario / App Móvil',
          to: `${className}Controller`,
          message: `GET /api/${plural}/{id}`,
          description: 'Petición GET para buscar por clave primaria.',
          type: 'sync',
        },
        {
          id: 2,
          from: `${className}Controller`,
          to: `${className}Service`,
          message: `get${className}ById(id)`,
          description: 'Llama al servicio de búsqueda por identificador.',
          type: 'sync',
        },
        {
          id: 3,
          from: `${className}Service`,
          to: `${className}Repository`,
          message: `findById(id)`,
          description: 'Consulta al repositorio JPA.',
          type: 'sync',
        },
        {
          id: 4,
          from: `${className}Repository`,
          to: 'Base de Datos (PostgreSQL)',
          message: `SELECT * FROM ${lower} WHERE id = ?`,
          description: 'Ejecuta SELECT por índice primario.',
          type: 'db',
        },
        {
          id: 5,
          from: 'Base de Datos (PostgreSQL)',
          to: `${className}Repository`,
          message: 'Result row / null',
          description: 'Retorna los datos de la fila.',
          type: 'return',
        },
        {
          id: 6,
          from: `${className}Repository`,
          to: `${className}Service`,
          message: `Optional<${className}>`,
          description: 'Verifica existencia o lanza EntityNotFoundException (HTTP 404).',
          type: 'return',
        },
        {
          id: 7,
          from: `${className}Service`,
          to: `${className}Controller`,
          message: `retorna ${className}DTO`,
          description: 'Retorna el objeto transferible mapeado.',
          type: 'return',
        },
        {
          id: 8,
          from: `${className}Controller`,
          to: 'Usuario / App Móvil',
          message: 'HTTP 200 OK + JSON',
          description: 'Retorna código 200 con los datos de la entidad.',
          type: 'return',
        },
      ];

    case 'LIST':
      return [
        {
          id: 1,
          from: 'Usuario / App Móvil',
          to: `${className}Controller`,
          message: `GET /api/${plural}`,
          description: 'Petición GET para listar todos los registros.',
          type: 'sync',
        },
        {
          id: 2,
          from: `${className}Controller`,
          to: `${className}Service`,
          message: `getAll${className}s()`,
          description: 'Invoca lógica de recuperación de catálogo.',
          type: 'sync',
        },
        {
          id: 3,
          from: `${className}Service`,
          to: `${className}Repository`,
          message: `findAll()`,
          description: 'Solicita todos los registros de la tabla.',
          type: 'sync',
        },
        {
          id: 4,
          from: `${className}Repository`,
          to: 'Base de Datos (PostgreSQL)',
          message: `SELECT * FROM ${lower}`,
          description: 'Ejecuta consulta SELECT general.',
          type: 'db',
        },
        {
          id: 5,
          from: 'Base de Datos (PostgreSQL)',
          to: `${className}Repository`,
          message: 'List<Row>',
          description: 'Dataset resultante de la consulta.',
          type: 'return',
        },
        {
          id: 6,
          from: `${className}Repository`,
          to: `${className}Service`,
          message: `List<${className}>`,
          description: 'Colección de entidades mapeadas por Hibernate.',
          type: 'return',
        },
        {
          id: 7,
          from: `${className}Service`,
          to: `${className}Controller`,
          message: `List<${className}DTO>`,
          description: 'Lista convertida a DTOs para la capa web.',
          type: 'return',
        },
        {
          id: 8,
          from: `${className}Controller`,
          to: 'Usuario / App Móvil',
          message: 'HTTP 200 OK (Array JSON)',
          description: 'Retorna array JSON con los registros.',
          type: 'return',
        },
      ];

    case 'UPDATE':
      return [
        {
          id: 1,
          from: 'Usuario / App Móvil',
          to: `${className}Controller`,
          message: `PUT /api/${plural}/{id} (${className}DTO)`,
          description: 'Petición PUT con datos actualizados.',
          type: 'sync',
        },
        {
          id: 2,
          from: `${className}Controller`,
          to: `${className}Service`,
          message: `update${className}(id, dto)`,
          description: 'Delega la actualización al servicio transaccional.',
          type: 'sync',
        },
        {
          id: 3,
          from: `${className}Service`,
          to: `${className}Repository`,
          message: `findById(id)`,
          description: 'Recupera la entidad actual para validar existencia.',
          type: 'sync',
        },
        {
          id: 4,
          from: `${className}Repository`,
          to: `${className}Service`,
          message: `entidad actual encontrada`,
          description: 'Servicio actualiza campos de la entidad gestionada.',
          type: 'return',
        },
        {
          id: 5,
          from: `${className}Service`,
          to: `${className}Repository`,
          message: `save(updatedEntity)`,
          description: 'Persiste los cambios en la base de datos.',
          type: 'sync',
        },
        {
          id: 6,
          from: `${className}Repository`,
          to: 'Base de Datos (PostgreSQL)',
          message: `UPDATE ${lower} SET ... WHERE id = ?`,
          description: 'Ejecuta sentencia UPDATE SQL.',
          type: 'db',
        },
        {
          id: 7,
          from: 'Base de Datos (PostgreSQL)',
          to: `${className}Controller`,
          message: 'Row updated',
          description: 'Confirmación de actualización en base de datos.',
          type: 'return',
        },
        {
          id: 8,
          from: `${className}Controller`,
          to: 'Usuario / App Móvil',
          message: 'HTTP 200 OK + JSON actualizado',
          description: 'Retorna objeto actualizado con status 200.',
          type: 'return',
        },
      ];

    case 'DELETE':
      return [
        {
          id: 1,
          from: 'Usuario / App Móvil',
          to: `${className}Controller`,
          message: `DELETE /api/${plural}/{id}`,
          description: 'Petición DELETE para eliminar un registro por ID.',
          type: 'sync',
        },
        {
          id: 2,
          from: `${className}Controller`,
          to: `${className}Service`,
          message: `delete${className}(id)`,
          description: 'Invoca lógica de eliminación segura.',
          type: 'sync',
        },
        {
          id: 3,
          from: `${className}Service`,
          to: `${className}Repository`,
          message: `deleteById(id)`,
          description: 'Llama al método de eliminación de Spring Data.',
          type: 'sync',
        },
        {
          id: 4,
          from: `${className}Repository`,
          to: 'Base de Datos (PostgreSQL)',
          message: `DELETE FROM ${lower} WHERE id = ?`,
          description: 'Ejecuta sentencia DELETE SQL verificando integridad referencial (FK).',
          type: 'db',
        },
        {
          id: 5,
          from: 'Base de Datos (PostgreSQL)',
          to: `${className}Controller`,
          message: 'Row deleted',
          description: 'Registro eliminado con éxito.',
          type: 'return',
        },
        {
          id: 6,
          from: `${className}Controller`,
          to: 'Usuario / App Móvil',
          message: 'HTTP 204 No Content',
          description: 'Retorna código 204 confirmando eliminación sin cuerpo.',
          type: 'return',
        },
      ];
  }
}

export function generatePlantUmlSequence(
  className: string,
  operation: SequenceOperation,
  _attributes: UmlAttribute[] = [],
  _relations: UmlRelation[] = [],
): string {
  const lower = className.toLowerCase();

  const lines: string[] = [
    `@startuml`,
    `title Diagrama de Secuencia UML - Caso de Uso: ${operation} ${className} (Spring Boot 4 Capas)`,
    `autonumber`,
    `skinparam style strictuml`,
    `skinparam BoxPadding 10`,
    `skinparam ParticipantPadding 15`,
    ``,
    `actor "Usuario / Cliente" as Client`,
    `box "Capa Web (Spring MVC)" #EBF8FF`,
    `  participant "${className}Controller" as Controller << (C,#4299E1) Controller >>`,
    `end box`,
    `box "Capa de Negocio" #FEEBC8`,
    `  participant "${className}Service" as Service << (S,#ED8936) Service >>`,
    `end box`,
    `box "Capa de Acceso a Datos" #C6F6D5`,
    `  participant "${className}Repository" as Repo << (R,#48BB78) Repository >>`,
    `end box`,
    `database "PostgreSQL / DB" as DB`,
    ``,
  ];

  if (operation === 'CREATE') {
    lines.push(`Client -> Controller : POST /api/${lower}s (${className}DTO)`);
    lines.push(`activate Controller`);
    lines.push(`Controller -> Service : create${className}(dto)`);
    lines.push(`activate Service`);
    lines.push(`Service -> Repo : save(entity)`);
    lines.push(`activate Repo`);
    lines.push(`Repo -> DB : INSERT INTO ${lower} (...) VALUES (...)`);
    lines.push(`activate DB`);
    lines.push(`DB --> Repo : Confirmación (ID generado)`);
    lines.push(`deactivate DB`);
    lines.push(`Repo --> Service : Entidad persistida`);
    lines.push(`deactivate Repo`);
    lines.push(`Service --> Controller : ${className}DTO mapeado`);
    lines.push(`deactivate Service`);
    lines.push(`Controller --> Client : HTTP 201 Created (JSON)`);
    lines.push(`deactivate Controller`);
  } else if (operation === 'GET_BY_ID') {
    lines.push(`Client -> Controller : GET /api/${lower}s/{id}`);
    lines.push(`activate Controller`);
    lines.push(`Controller -> Service : get${className}ById(id)`);
    lines.push(`activate Service`);
    lines.push(`Service -> Repo : findById(id)`);
    lines.push(`activate Repo`);
    lines.push(`Repo -> DB : SELECT * FROM ${lower} WHERE id = ?`);
    lines.push(`activate DB`);
    lines.push(`DB --> Repo : Fila encontrada`);
    lines.push(`deactivate DB`);
    lines.push(`Repo --> Service : Optional<${className}>`);
    lines.push(`deactivate Repo`);
    lines.push(`Service --> Controller : ${className}DTO`);
    lines.push(`deactivate Service`);
    lines.push(`Controller --> Client : HTTP 200 OK (JSON)`);
    lines.push(`deactivate Controller`);
  } else if (operation === 'LIST') {
    lines.push(`Client -> Controller : GET /api/${lower}s`);
    lines.push(`activate Controller`);
    lines.push(`Controller -> Service : getAll${className}s()`);
    lines.push(`activate Service`);
    lines.push(`Service -> Repo : findAll()`);
    lines.push(`activate Repo`);
    lines.push(`Repo -> DB : SELECT * FROM ${lower}`);
    lines.push(`activate DB`);
    lines.push(`DB --> Repo : List<Row>`);
    lines.push(`deactivate DB`);
    lines.push(`Repo --> Service : List<${className}>`);
    lines.push(`deactivate Repo`);
    lines.push(`Service --> Controller : List<${className}DTO>`);
    lines.push(`deactivate Service`);
    lines.push(`Controller --> Client : HTTP 200 OK (Array JSON)`);
    lines.push(`deactivate Controller`);
  } else if (operation === 'UPDATE') {
    lines.push(`Client -> Controller : PUT /api/${lower}s/{id} (${className}DTO)`);
    lines.push(`activate Controller`);
    lines.push(`Controller -> Service : update${className}(id, dto)`);
    lines.push(`activate Service`);
    lines.push(`Service -> Repo : findById(id)`);
    lines.push(`activate Repo`);
    lines.push(`Repo --> Service : Entidad existente`);
    lines.push(`deactivate Repo`);
    lines.push(`Service -> Repo : save(updatedEntity)`);
    lines.push(`activate Repo`);
    lines.push(`Repo -> DB : UPDATE ${lower} SET ... WHERE id = ?`);
    lines.push(`activate DB`);
    lines.push(`DB --> Repo : OK`);
    lines.push(`deactivate DB`);
    lines.push(`Repo --> Service : Entidad actualizada`);
    lines.push(`deactivate Repo`);
    lines.push(`Service --> Controller : ${className}DTO`);
    lines.push(`deactivate Service`);
    lines.push(`Controller --> Client : HTTP 200 OK`);
    lines.push(`deactivate Controller`);
  } else if (operation === 'DELETE') {
    lines.push(`Client -> Controller : DELETE /api/${lower}s/{id}`);
    lines.push(`activate Controller`);
    lines.push(`Controller -> Service : delete${className}(id)`);
    lines.push(`activate Service`);
    lines.push(`Service -> Repo : deleteById(id)`);
    lines.push(`activate Repo`);
    lines.push(`Repo -> DB : DELETE FROM ${lower} WHERE id = ?`);
    lines.push(`activate DB`);
    lines.push(`DB --> Repo : OK`);
    lines.push(`deactivate DB`);
    lines.push(`Repo --> Service : Confirmación`);
    lines.push(`deactivate Repo`);
    lines.push(`Service --> Controller : void`);
    lines.push(`deactivate Service`);
    lines.push(`Controller --> Client : HTTP 204 No Content`);
    lines.push(`deactivate Controller`);
  }

  lines.push(``);
  lines.push(`@enduml`);
  return lines.join('\n');
}

export function generateMermaidSequence(
  className: string,
  operation: SequenceOperation,
  _relations: UmlRelation[] = [],
): string {
  const lower = className.toLowerCase();
  const lines: string[] = [
    `sequenceDiagram`,
    `  autonumber`,
    `  actor Client as Usuario / App Móvil`,
    `  participant C as ${className}Controller`,
    `  participant S as ${className}Service`,
    `  participant R as ${className}Repository`,
    `  participant DB as PostgreSQL / DB`,
    ``,
  ];

  if (operation === 'CREATE') {
    lines.push(`  Client->>+C: POST /api/${lower}s (${className}DTO)`);
    lines.push(`  C->>+S: create${className}(dto)`);
    lines.push(`  S->>+R: save(entity)`);
    lines.push(`  R->>+DB: INSERT INTO ${lower} VALUES (...)`);
    lines.push(`  DB-->>-R: Confirmación (ID generado)`);
    lines.push(`  R-->>-S: Entidad persistida`);
    lines.push(`  S-->>-C: ${className}DTO`);
    lines.push(`  C-->>-Client: HTTP 201 Created (JSON)`);
  } else if (operation === 'GET_BY_ID') {
    lines.push(`  Client->>+C: GET /api/${lower}s/{id}`);
    lines.push(`  C->>+S: get${className}ById(id)`);
    lines.push(`  S->>+R: findById(id)`);
    lines.push(`  R->>+DB: SELECT * FROM ${lower} WHERE id = ?`);
    lines.push(`  DB-->>-R: Row data`);
    lines.push(`  R-->>-S: Optional<${className}>`);
    lines.push(`  S-->>-C: ${className}DTO`);
    lines.push(`  C-->>-Client: HTTP 200 OK (JSON)`);
  } else if (operation === 'LIST') {
    lines.push(`  Client->>+C: GET /api/${lower}s`);
    lines.push(`  C->>+S: getAll${className}s()`);
    lines.push(`  S->>+R: findAll()`);
    lines.push(`  R->>+DB: SELECT * FROM ${lower}`);
    lines.push(`  DB-->>-R: List<Row>`);
    lines.push(`  R-->>-S: List<${className}>`);
    lines.push(`  S-->>-C: List<${className}DTO>`);
    lines.push(`  C-->>-Client: HTTP 200 OK (Array JSON)`);
  } else if (operation === 'UPDATE') {
    lines.push(`  Client->>+C: PUT /api/${lower}s/{id} (${className}DTO)`);
    lines.push(`  C->>+S: update${className}(id, dto)`);
    lines.push(`  S->>+R: findById(id)`);
    lines.push(`  R-->>S: Entidad existente`);
    lines.push(`  S->>+R: save(updatedEntity)`);
    lines.push(`  R->>+DB: UPDATE ${lower} SET ...`);
    lines.push(`  DB-->>-R: Row updated`);
    lines.push(`  R-->>-S: Entidad actualizada`);
    lines.push(`  S-->>-C: ${className}DTO`);
    lines.push(`  C-->>-Client: HTTP 200 OK`);
  } else if (operation === 'DELETE') {
    lines.push(`  Client->>+C: DELETE /api/${lower}s/{id}`);
    lines.push(`  C->>+S: delete${className}(id)`);
    lines.push(`  S->>+R: deleteById(id)`);
    lines.push(`  R->>+DB: DELETE FROM ${lower} WHERE id = ?`);
    lines.push(`  DB-->>-R: Row deleted`);
    lines.push(`  R-->>-S: Confirmación`);
    lines.push(`  S-->>-C: void`);
    lines.push(`  C-->>-Client: HTTP 204 No Content`);
  }

  return lines.join('\n');
}
