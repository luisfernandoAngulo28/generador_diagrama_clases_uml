import type { UmlClass, UmlModel } from '../../diagrams/uml.types.js';
import { decapitalize, pluralize, toJavaType } from '../java-type.util.js';

function buildSampleJson(
  cls: UmlClass,
  model: UmlModel,
  isUpdate = false,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  for (const attr of cls.attributes) {
    if (attr.isPrimaryKey) continue;

    const name = attr.name;
    const lower = name.toLowerCase();
    const javaType = toJavaType(attr.type);

    if (lower === 'nombre' || lower === 'name') {
      obj[name] = isUpdate ? `${cls.name} Actualizado` : `Nuevo ${cls.name}`;
    } else if (lower.includes('apellido')) {
      obj[name] = isUpdate ? 'Gómez' : 'Mendoza';
    } else if (lower.includes('email') || lower.includes('correo')) {
      obj[name] = isUpdate ? 'usuario.actualizado@example.com' : 'nuevo.usuario@example.com';
    } else if (lower.includes('telefono') || lower.includes('celular')) {
      obj[name] = '+591 71234567';
    } else if (lower.includes('direccion') || lower.includes('address')) {
      obj[name] = 'Av. Las Palmeras #456';
    } else if (lower.includes('precio') || lower.includes('monto') || lower.includes('total')) {
      obj[name] = isUpdate ? 75.5 : 50.0;
    } else if (lower.includes('codigo') || lower.includes('code')) {
      obj[name] = isUpdate ? 'COD-ACT-99' : 'COD-001';
    } else if (lower.includes('stock') || lower.includes('cantidad') || lower.includes('capacidad')) {
      obj[name] = isUpdate ? 25 : 10;
    } else if (lower.includes('estado') || lower.includes('status')) {
      obj[name] = isUpdate ? 'COMPLETADO' : 'ACTIVO';
    } else if (lower.includes('fecha') || lower.includes('date')) {
      obj[name] = '2026-09-22';
    } else if (javaType === 'Boolean') {
      obj[name] = true;
    } else if (javaType === 'Integer' || javaType === 'Long') {
      obj[name] = 100;
    } else if (javaType === 'Double' || javaType === 'Float' || javaType === 'BigDecimal') {
      obj[name] = 29.99;
    } else {
      obj[name] = isUpdate ? 'Valor Actualizado' : 'Valor Inicial';
    }
  }

  // Si no es update, incluir referencias ManyToOne si existen
  if (!isUpdate) {
    const outgoingManyToOnes = model.relations.filter(
      (r) =>
        (r.type === 'MANY_TO_ONE' ||
          r.type === 'ASSOCIATION' ||
          r.type === 'AGGREGATION' ||
          r.type === 'COMPOSITION' ||
          r.type === 'ONE_TO_ONE') &&
        r.sourceClassId === cls.id,
    );

    for (const rel of outgoingManyToOnes) {
      const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
      if (targetCls) {
        const fieldName = rel.targetRole ?? decapitalize(targetCls.name);
        obj[fieldName] = { id: 1 };
      }
    }
  }

  return obj;
}

export function renderPostmanCollection(model: UmlModel, projectName: string): string {
  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );

  const folders = entities.map((cls) => {
    const varName = decapitalize(cls.name);
    const basePath = pluralize(varName);
    const entityTitle = pluralize(cls.name);

    const postBody = JSON.stringify(buildSampleJson(cls, model, false), null, 2);
    const putBody = JSON.stringify(buildSampleJson(cls, model, true), null, 2);

    return {
      name: entityTitle,
      item: [
        {
          name: `Listar todos los ${basePath}`,
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: `{{baseUrl}}/${basePath}`,
              host: ['{{baseUrl}}'],
              path: [basePath],
            },
            description: `Recupera la lista completa de registros de ${cls.name}.`,
          },
        },
        {
          name: `Obtener ${cls.name} por ID`,
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: `{{baseUrl}}/${basePath}/1`,
              host: ['{{baseUrl}}'],
              path: [basePath, '1'],
            },
            description: `Recupera un registro específico de ${cls.name} mediante su ID.`,
          },
        },
        {
          name: `Crear ${cls.name}`,
          request: {
            method: 'POST',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
              },
            ],
            body: {
              mode: 'raw',
              raw: postBody,
              options: {
                raw: {
                  language: 'json',
                },
              },
            },
            url: {
              raw: `{{baseUrl}}/${basePath}`,
              host: ['{{baseUrl}}'],
              path: [basePath],
            },
            description: `Crea un nuevo registro de ${cls.name}.`,
          },
        },
        {
          name: `Actualizar ${cls.name} por ID`,
          request: {
            method: 'PUT',
            header: [
              {
                key: 'Content-Type',
                value: 'application/json',
              },
            ],
            body: {
              mode: 'raw',
              raw: putBody,
              options: {
                raw: {
                  language: 'json',
                },
              },
            },
            url: {
              raw: `{{baseUrl}}/${basePath}/1`,
              host: ['{{baseUrl}}'],
              path: [basePath, '1'],
            },
            description: `Actualiza los campos de un ${cls.name} existente.`,
          },
        },
        {
          name: `Eliminar ${cls.name} por ID`,
          request: {
            method: 'DELETE',
            header: [],
            url: {
              raw: `{{baseUrl}}/${basePath}/1`,
              host: ['{{baseUrl}}'],
              path: [basePath, '1'],
            },
            description: `Elimina un registro de ${cls.name} por su ID.`,
          },
        },
      ],
    };
  });

  const collection = {
    info: {
      _postman_id: crypto.randomUUID(),
      name: `${projectName} API`,
      description: `Colección Postman v2.1 generada automáticamente para ${projectName}. Contiene los endpoints CRUD de la arquitectura Spring Boot de 4 capas.`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:8080/api',
        type: 'string',
      },
    ],
    item: folders,
  };

  return JSON.stringify(collection, null, 2);
}
