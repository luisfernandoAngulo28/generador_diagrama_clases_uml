import type { UmlClass, UmlModel } from '../types/uml';

export interface MockEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  className: string;
  sampleBody?: any;
}

export interface MockResponse {
  status: number;
  statusText: string;
  timeMs: number;
  headers: Record<string, string>;
  data: any;
}

/**
 * Generates sensible synthetic data for an attribute based on its name and UML type
 */
function generateSyntheticValue(attrName: string, type: string, index: number): any {
  const lowerName = attrName.toLowerCase();
  const lowerType = type.toLowerCase();

  if (lowerName === 'id') return index + 1;
  if (lowerName.includes('uuid')) return `550e8400-e29b-41d4-a716-44665544000${index}`;
  if (lowerName.includes('email') || lowerName.includes('correo')) return `usuario${index + 1}@ejemplo.com`;
  if (lowerName.includes('phone') || lowerName.includes('telefono') || lowerName.includes('celular')) return `+591 7001234${index}`;
  if (lowerName.includes('name') || lowerName.includes('nombre')) {
    const names = ['Ana Gomez', 'Carlos Perez', 'Sofia Rodriguez', 'David Fernandez', 'Elena Morales'];
    return names[index % names.length];
  }
  if (lowerName.includes('title') || lowerName.includes('titulo')) return `Item de Prueba #${index + 1}`;
  if (lowerName.includes('desc') || lowerName.includes('descripcion')) return `Descripción detallada para el registro número ${index + 1}`;
  if (lowerName.includes('price') || lowerName.includes('precio') || lowerName.includes('monto') || lowerName.includes('total')) {
    return Number((19.99 * (index + 1)).toFixed(2));
  }
  if (lowerName.includes('quantity') || lowerName.includes('cantidad') || lowerName.includes('stock')) {
    return (index + 1) * 10;
  }
  if (lowerName.includes('status') || lowerName.includes('estado')) {
    const statuses = ['ACTIVO', 'PENDIENTE', 'COMPLETADO', 'PROCESANDO'];
    return statuses[index % statuses.length];
  }
  if (lowerName.includes('date') || lowerName.includes('fecha') || lowerName.includes('createdat') || lowerName.includes('at')) {
    return new Date(Date.now() - index * 86400000).toISOString().split('T')[0];
  }

  // Type fallbacks
  if (lowerType === 'int' || lowerType === 'integer' || lowerType === 'long') {
    return (index + 1) * 100;
  }
  if (lowerType === 'double' || lowerType === 'float' || lowerType === 'bigdecimal') {
    return Number((25.5 * (index + 1)).toFixed(2));
  }
  if (lowerType === 'boolean') {
    return index % 2 === 0;
  }
  if (lowerType === 'date' || lowerType === 'localdate') {
    return new Date().toISOString().split('T')[0];
  }

  return `${attrName}_${index + 1}`;
}

/**
 * Creates seed records for a given class
 */
export function generateSeedRecords(umlClass: UmlClass, count = 3): any[] {
  const records: any[] = [];

  for (let i = 0; i < count; i++) {
    const item: Record<string, any> = {};
    let hasId = false;

    for (const attr of umlClass.attributes) {
      if (attr.name.toLowerCase() === 'id') hasId = true;
      item[attr.name] = generateSyntheticValue(attr.name, attr.type, i);
    }

    if (!hasId) {
      item.id = i + 1;
    }

    records.push(item);
  }

  return records;
}

/**
 * In-browser mock database store
 */
export class MockDatabase {
  private tables: Map<string, any[]> = new Map();

  constructor(model: UmlModel) {
    this.seed(model);
  }

  seed(model: UmlModel) {
    this.tables.clear();
    for (const cls of model.classes) {
      if (cls.stereotype === 'interface' || cls.stereotype === 'enum') continue;
      const key = cls.name.toLowerCase();
      this.tables.set(key, generateSeedRecords(cls, 3));
    }
  }

  list(className: string): any[] {
    const key = className.toLowerCase();
    return [...(this.tables.get(key) ?? [])];
  }

  getById(className: string, id: any): any | null {
    const key = className.toLowerCase();
    const rows = this.tables.get(key) ?? [];
    return rows.find((r) => String(r.id) === String(id)) ?? null;
  }

  create(className: string, payload: any): any {
    const key = className.toLowerCase();
    const rows = this.tables.get(key) ?? [];
    
    // Auto-generate numeric ID if not provided
    const nextId = rows.reduce((max, r) => {
      const num = Number(r.id);
      return !isNaN(num) && num > max ? num : max;
    }, 0) + 1;

    const newRecord = {
      ...payload,
      id: payload.id !== undefined ? payload.id : nextId,
    };

    rows.push(newRecord);
    this.tables.set(key, rows);
    return newRecord;
  }

  update(className: string, id: any, payload: any): any | null {
    const key = className.toLowerCase();
    const rows = this.tables.get(key) ?? [];
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return null;

    const updated = {
      ...rows[idx],
      ...payload,
      id: rows[idx].id, // preserve ID
    };
    rows[idx] = updated;
    this.tables.set(key, rows);
    return updated;
  }

  delete(className: string, id: any): boolean {
    const key = className.toLowerCase();
    const rows = this.tables.get(key) ?? [];
    const prevLength = rows.length;
    const filtered = rows.filter((r) => String(r.id) !== String(id));
    this.tables.set(key, filtered);
    return filtered.length < prevLength;
  }

  getTableNames(): string[] {
    return Array.from(this.tables.keys());
  }
}

/**
 * Generates standard REST endpoints for an entity
 */
export function getMockEndpointsForClass(umlClass: UmlClass): MockEndpoint[] {
  const resource = umlClass.name.toLowerCase() + 's';
  const sampleNewItem: Record<string, any> = {};
  for (const attr of umlClass.attributes) {
    if (attr.name.toLowerCase() === 'id') continue;
    sampleNewItem[attr.name] = generateSyntheticValue(attr.name, attr.type, 9);
  }

  return [
    {
      method: 'GET',
      path: `/api/v1/${resource}`,
      description: `Listar todos los registros de ${umlClass.name}`,
      className: umlClass.name,
    },
    {
      method: 'GET',
      path: `/api/v1/${resource}/1`,
      description: `Consultar ${umlClass.name} por ID (ej. id = 1)`,
      className: umlClass.name,
    },
    {
      method: 'POST',
      path: `/api/v1/${resource}`,
      description: `Crear nuevo registro de ${umlClass.name}`,
      className: umlClass.name,
      sampleBody: sampleNewItem,
    },
    {
      method: 'PUT',
      path: `/api/v1/${resource}/1`,
      description: `Actualizar registro de ${umlClass.name} con ID = 1`,
      className: umlClass.name,
      sampleBody: sampleNewItem,
    },
    {
      method: 'DELETE',
      path: `/api/v1/${resource}/1`,
      description: `Eliminar registro de ${umlClass.name} con ID = 1`,
      className: umlClass.name,
    },
  ];
}

/**
 * Executes a simulated HTTP call against the in-memory database
 */
export function executeMockRequest(
  db: MockDatabase,
  endpoint: MockEndpoint,
  parsedBody?: any
): MockResponse {
  const start = performance.now();
  const { method, className, path } = endpoint;
  const isDetail = path.includes('/1');
  const targetId = 1;

  let status = 200;
  let statusText = 'OK';
  let data: any = null;

  try {
    switch (method) {
      case 'GET':
        if (isDetail) {
          const item = db.getById(className, targetId);
          if (item) {
            data = item;
          } else {
            status = 404;
            statusText = 'Not Found';
            data = {
              timestamp: new Date().toISOString(),
              status: 404,
              error: 'Not Found',
              message: `No se encontró ${className} con id = ${targetId}`,
              path,
            };
          }
        } else {
          data = db.list(className);
        }
        break;

      case 'POST': {
        const created = db.create(className, parsedBody || {});
        status = 201;
        statusText = 'Created';
        data = created;
        break;
      }

      case 'PUT': {
        const updated = db.update(className, targetId, parsedBody || {});
        if (updated) {
          status = 200;
          statusText = 'OK';
          data = updated;
        } else {
          status = 404;
          statusText = 'Not Found';
          data = {
            timestamp: new Date().toISOString(),
            status: 404,
            error: 'Not Found',
            message: `No se pudo actualizar: ${className} con id = ${targetId} no existe`,
            path,
          };
        }
        break;
      }

      case 'DELETE': {
        const deleted = db.delete(className, targetId);
        if (deleted) {
          status = 200;
          statusText = 'OK';
          data = {
            message: `Registro ${className} con id = ${targetId} eliminado exitosamente.`,
            success: true,
          };
        } else {
          status = 404;
          statusText = 'Not Found';
          data = {
            timestamp: new Date().toISOString(),
            status: 404,
            error: 'Not Found',
            message: `No se encontró ${className} con id = ${targetId} para eliminar`,
            path,
          };
        }
        break;
      }
    }
  } catch (err: any) {
    status = 500;
    statusText = 'Internal Server Error';
    data = { error: err?.message || 'Error inesperado en simulación' };
  }

  const duration = Math.round(performance.now() - start) + Math.floor(Math.random() * 25 + 15);

  return {
    status,
    statusText,
    timeMs: duration,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'x-powered-by': 'Antigravity-In-Browser-SpringMock-Engine',
      'x-mock-latency': `${duration}ms`,
    },
    data,
  };
}

/**
 * Formats a cURL command for testing externally (e.g. Postman or terminal)
 */
export function generateCurlCommand(endpoint: MockEndpoint, baseUrl = 'http://localhost:8080', body?: any): string {
  const parts = [`curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`];
  parts.push('-H "Accept: application/json"');

  if ((endpoint.method === 'POST' || endpoint.method === 'PUT') && body) {
    parts.push('-H "Content-Type: application/json"');
    parts.push(`-d '${JSON.stringify(body, null, 2)}'`);
  }

  return parts.join(' \\\n  ');
}
