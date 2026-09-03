import { Injectable } from '@nestjs/common';
import type { UmlModel } from '../diagrams/uml.types.js';
import { renderEntity } from './templates/entity.template.js';
import { renderEnum } from './templates/enum.template.js';
import { renderInterface } from './templates/interface.template.js';
import { renderRepository } from './templates/repository.template.js';
import { renderService } from './templates/service.template.js';
import { renderController } from './templates/controller.template.js';
import {
  renderApplicationClass,
  renderApplicationProperties,
  renderPomXml,
} from './templates/project-files.template.js';
import { renderJacksonConfig } from './templates/jackson-config.template.js';
import { capitalize } from './java-type.util.js';

export interface GeneratorOptions {
  projectName: string;
  groupId?: string;
}

/** Map of file path (relative to project root) -> file content. */
export type GeneratedProject = Record<string, string>;

@Injectable()
export class GeneratorService {
  /**
   * Core code-gen engine: turns a validated UML model into a full,
   * runnable Spring Boot + PostgreSQL project (4-layer architecture).
   */
  generate(model: UmlModel, options: GeneratorOptions): GeneratedProject {
    const groupId = options.groupId ?? 'com.example';
    const packageName = `${groupId}.${sanitizePackageSegment(options.projectName)}`;
    const packagePath = packageName.replace(/\./g, '/');
    const appClassName = `${capitalize(sanitizePackageSegment(options.projectName))}Application`;

    const files: GeneratedProject = {};

    files[`pom.xml`] = renderPomXml(options.projectName, groupId);
    files[`src/main/resources/application.properties`] =
      renderApplicationProperties(options.projectName);
    files[`src/main/java/${packagePath}/${appClassName}.java`] =
      renderApplicationClass(packageName, appClassName);
    files[`src/main/java/${packagePath}/config/JacksonConfig.java`] =
      renderJacksonConfig(packageName);

    for (const cls of model.classes) {
      if (cls.stereotype === 'enum') {
        files[`src/main/java/${packagePath}/model/${cls.name}.java`] =
          renderEnum(cls, packageName);
        continue;
      }

      if (cls.stereotype === 'interface') {
        files[`src/main/java/${packagePath}/model/${cls.name}.java`] =
          renderInterface(cls, packageName);
        continue;
      }

      files[`src/main/java/${packagePath}/entity/${cls.name}.java`] =
        renderEntity(cls, model, packageName);
      files[`src/main/java/${packagePath}/repository/${cls.name}Repository.java`] =
        renderRepository(cls, packageName);
      files[`src/main/java/${packagePath}/service/${cls.name}Service.java`] =
        renderService(cls, packageName);
      files[`src/main/java/${packagePath}/controller/${cls.name}Controller.java`] =
        renderController(cls, packageName);
    }

    return files;
  }
}

function sanitizePackageSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^[0-9]+/, '');
}
