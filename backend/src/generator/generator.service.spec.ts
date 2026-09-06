import { describe, expect, it } from 'vitest';
import { GeneratorService } from './generator.service.js';
import type { UmlModel } from '../diagrams/uml.types.js';

describe('GeneratorService', () => {
  const service = new GeneratorService();

  const sampleModel: UmlModel = {
    classes: [
      {
        id: 'c1',
        name: 'Cliente',
        attributes: [
          { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
          { name: 'nombre', type: 'String', visibility: 'private' },
        ],
      },
    ],
    relations: [],
  };

  it('generates pom.xml with springdoc-openapi for Swagger UI', () => {
    const files = service.generate(sampleModel, { projectName: 'barberia' });
    expect(files['pom.xml']).toBeDefined();
    expect(files['pom.xml']).toContain('springdoc-openapi-starter-webmvc-ui');
  });

  it('generates docker-compose.yml and Dockerfile', () => {
    const files = service.generate(sampleModel, { projectName: 'barberia' });
    expect(files['docker-compose.yml']).toBeDefined();
    expect(files['docker-compose.yml']).toContain('postgres:16-alpine');
    expect(files['docker-compose.yml']).toContain('POSTGRES_DB: barberia');
    expect(files['Dockerfile']).toBeDefined();
    expect(files['Dockerfile']).toContain('eclipse-temurin');
  });

  it('generates OpenApiConfig and Swagger annotations in Controller', () => {
    const files = service.generate(sampleModel, { projectName: 'barberia' });
    const configPath = 'src/main/java/com/example/barberia/config/OpenApiConfig.java';
    const controllerPath = 'src/main/java/com/example/barberia/controller/ClienteController.java';

    expect(files[configPath]).toBeDefined();
    expect(files[configPath]).toContain('public class OpenApiConfig');
    expect(files[configPath]).toContain('barberia API');

    expect(files[controllerPath]).toBeDefined();
    expect(files[controllerPath]).toContain('@Tag(name = "Cliente"');
    expect(files[controllerPath]).toContain('@Operation(summary = "Listar todos los clientes")');
  });

  it('generates README.md with Swagger URL and endpoints', () => {
    const files = service.generate(sampleModel, { projectName: 'barberia' });
    expect(files['README.md']).toBeDefined();
    expect(files['README.md']).toContain('http://localhost:8080/swagger-ui.html');
    expect(files['README.md']).toContain('/api/clientes');
  });
});
