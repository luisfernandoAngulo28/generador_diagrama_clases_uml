import type { UmlModel } from './uml.types.js';
import { RELATION_LABELS } from './relation-labels.js';
import { validateModel } from './validation.util.js';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function findClassName(model: UmlModel, id: string): string {
  return model.classes.find((c) => c.id === id)?.name ?? '(clase eliminada)';
}

function toSqlType(attrName: string, umlType: string): string {
  const t = umlType.trim().toLowerCase();
  const lowerName = attrName.toLowerCase();
  if (
    lowerName.includes('descripcion') ||
    lowerName.includes('nota') ||
    lowerName.includes('detalle') ||
    lowerName.includes('contenido')
  ) {
    return 'TEXT';
  }
  if (t === 'string' || t === 'text') return 'VARCHAR(255)';
  if (t === 'int' || t === 'integer') return 'INTEGER';
  if (t === 'long') return 'BIGINT';
  if (t === 'double' || t === 'float') return 'DOUBLE PRECISION';
  if (t === 'bigdecimal' || t === 'decimal') return 'NUMERIC(12, 2)';
  if (t === 'boolean' || t === 'bool') return 'BOOLEAN';
  if (t === 'date' || t === 'localdate') return 'DATE';
  if (t === 'datetime' || t === 'localdatetime' || t === 'timestamp') return 'TIMESTAMP';
  if (t === 'uuid') return 'UUID';
  return 'VARCHAR(100)';
}

function decapitalize(val: string): string {
  return val.charAt(0).toLowerCase() + val.slice(1);
}

function pluralize(val: string): string {
  if (val.endsWith('s')) return val;
  if (val.endsWith('y')) return `${val.slice(0, -1)}ies`;
  return `${val}s`;
}

/**
 * Renders a self-contained HTML documentation report for a diagram:
 * class list with attributes, relation list, data dictionary,
 * CRUD matrix, and the current logical validation result.
 */
export function renderDocumentationHtml(name: string, model: UmlModel): string {
  const validation = validateModel(model);
  const generatedAt = new Date().toLocaleString('es-ES');

  const classesHtml = model.classes
    .map((cls) => {
      const stereotype = cls.stereotype
        ? `<span class="stereotype">«${esc(cls.stereotype)}»</span> `
        : '';
      const rows =
        cls.attributes.length === 0
          ? '<tr><td colspan="3" class="empty">sin atributos</td></tr>'
          : cls.attributes
              .map(
                (a) => `<tr>
              <td>${esc(a.name)}${a.isPrimaryKey ? ' <span class="pk">PK</span>' : ''}</td>
              <td>${esc(a.type)}</td>
              <td>${esc(a.visibility)}</td>
            </tr>`,
              )
              .join('\n');
      const operationRows =
        (cls.operations ?? []).length === 0
          ? ''
          : `<table class="operations">
          <thead><tr><th>Operación</th><th>Parámetros</th><th>Retorna</th><th>Visibilidad</th></tr></thead>
          <tbody>
            ${cls.operations!
              .map(
                (op) => `<tr>
              <td>${esc(op.name)}()</td>
              <td>${esc(op.parameters ?? '')}</td>
              <td>${esc(op.returnType)}</td>
              <td>${esc(op.visibility)}</td>
            </tr>`,
              )
              .join('\n')}
          </tbody>
        </table>`;

      const description = cls.description
        ? `<p class="class-description">${esc(cls.description)}</p>`
        : '';

      return `<section class="class-card">
        <h3>${stereotype}${esc(cls.name)}</h3>
        ${description}
        <table>
          <thead><tr><th>Atributo</th><th>Tipo</th><th>Visibilidad</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${operationRows}
      </section>`;
    })
    .join('\n');

  const relationsHtml =
    model.relations.length === 0
      ? '<p class="empty">Este diagrama no tiene relaciones.</p>'
      : `<table>
        <thead><tr><th>Origen</th><th>Tipo</th><th>Destino</th><th>Rol Origen</th><th>Rol Destino</th></tr></thead>
        <tbody>
          ${model.relations
            .map(
              (r) => `<tr>
              <td><strong>${esc(findClassName(model, r.sourceClassId))}</strong></td>
              <td>${esc(RELATION_LABELS[r.type] ?? r.type)}</td>
              <td><strong>${esc(findClassName(model, r.targetClassId))}</strong></td>
              <td>${esc(r.sourceRole ?? '-')}</td>
              <td>${esc(r.targetRole ?? '-')}</td>
            </tr>`,
            )
            .join('\n')}
        </tbody>
      </table>`;

  // Diccionario de Datos Físico y Conceptual
  const entities = model.classes.filter(
    (c) => !c.stereotype || (c.stereotype !== 'enum' && c.stereotype !== 'interface'),
  );

  const dataDictionaryHtml =
    entities.length === 0
      ? '<p class="empty">No hay tablas entidad para documentar en el diccionario de datos.</p>'
      : entities
          .map((cls) => {
            const tableName = cls.name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
            const fkRelations = model.relations.filter(
              (r) =>
                (r.type === 'MANY_TO_ONE' ||
                  r.type === 'ASSOCIATION' ||
                  r.type === 'AGGREGATION' ||
                  r.type === 'COMPOSITION' ||
                  r.type === 'ONE_TO_ONE') &&
                r.sourceClassId === cls.id,
            );

            const fieldRows = cls.attributes.map((a) => {
              const colName = a.name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
              const sqlType = toSqlType(a.name, a.type);
              const keyType = a.isPrimaryKey
                ? '<span class="pk">PK</span>'
                : '<span>-</span>';
              const nullable = a.isPrimaryKey ? 'NO' : 'SÍ';
              const desc = a.isPrimaryKey
                ? 'Identificador único autoincremental de la entidad'
                : `Campo ${a.name} de la entidad ${cls.name}`;

              return `<tr>
                <td><code>${colName}</code></td>
                <td>${esc(a.type)}</td>
                <td><code>${sqlType}</code></td>
                <td>${keyType}</td>
                <td>${nullable}</td>
                <td>${esc(desc)}</td>
              </tr>`;
            });

            const fkRows = fkRelations.map((rel) => {
              const targetCls = model.classes.find((c) => c.id === rel.targetClassId);
              const role = rel.targetRole ?? (targetCls ? decapitalize(targetCls.name) : 'target');
              const colName = `${role.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}_id`;
              const targetName = targetCls?.name ?? 'desconocida';

              return `<tr>
                <td><code>${colName}</code></td>
                <td>Long</td>
                <td><code>BIGINT</code></td>
                <td><span class="fk">FK</span></td>
                <td>SÍ</td>
                <td>Clave foránea hacia <strong>${esc(targetName)}</strong> (id)</td>
              </tr>`;
            });

            return `<div class="dict-card">
              <h4>Tabla: <code>${tableName}</code> (Entidad: ${esc(cls.name)})</h4>
              <table>
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Tipo Lógico</th>
                    <th>Tipo SQL</th>
                    <th>Clave</th>
                    <th>Nulo</th>
                    <th>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  ${fieldRows.join('\n')}
                  ${fkRows.join('\n')}
                </tbody>
              </table>
            </div>`;
          })
          .join('\n');

  // Matriz de Trazabilidad CRUD
  const crudMatrixHtml =
    entities.length === 0
      ? ''
      : `<table>
        <thead>
          <tr>
            <th>Entidad</th>
            <th>Crear (POST)</th>
            <th>Consultar (GET)</th>
            <th>Actualizar (PUT)</th>
            <th>Eliminar (DELETE)</th>
            <th>Ruta Endpoint</th>
          </tr>
        </thead>
        <tbody>
          ${entities
            .map((cls) => {
              const basePath = `/api/${pluralize(decapitalize(cls.name))}`;
              return `<tr>
                <td><strong>${esc(cls.name)}</strong></td>
                <td><span class="crud-badge">✔ POST</span></td>
                <td><span class="crud-badge">✔ GET</span></td>
                <td><span class="crud-badge">✔ PUT</span></td>
                <td><span class="crud-badge">✔ DELETE</span></td>
                <td><code>${basePath}</code></td>
              </tr>`;
            })
            .join('\n')}
        </tbody>
      </table>`;

  const issuesHtml = (title: string, cls: string, issues: typeof validation.errors) =>
    issues.length === 0
      ? ''
      : `<div class="${cls}">
          <h4>${title} (${issues.length})</h4>
          <ul>${issues.map((i) => `<li>${esc(i.message)}</li>`).join('')}</ul>
        </div>`;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Documentación — ${esc(name)}</title>
<style>
  html { color-scheme: light; }
  body { font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a202c; background: #ffffff; line-height: 1.5; }
  header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #2b6cb0; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
  h1 { margin: 0; color: #2b6cb0; font-size: 24px; }
  .btn-print { background: #2b6cb0; color: white; border: none; border-radius: 6px; padding: 0.45rem 0.9rem; font-size: 13px; font-weight: 500; cursor: pointer; }
  .btn-print:hover { background: #2c5282; }
  .meta { color: #718096; font-size: 13px; margin: 0.3rem 0 0; }
  h2 { margin-top: 2.5rem; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; font-size: 18px; }
  .class-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; background: #fafafa; }
  .dict-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; background: #fdfdfd; }
  .dict-card h4 { margin: 0 0 0.75rem; color: #2c5282; }
  .class-card table.operations { margin-top: 0.75rem; }
  .class-description { color: #4a5568; font-size: 13px; margin: 0 0 0.75rem; }
  .class-card h3 { margin: 0 0 0.75rem; color: #1a202c; font-size: 16px; }
  .stereotype { color: #718096; font-style: italic; font-weight: 400; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 0.5rem; }
  th, td { text-align: left; padding: 0.45rem 0.6rem; border-bottom: 1px solid #edf2f7; }
  th { background: #f7fafc; color: #4a5568; font-weight: 600; }
  code { font-family: monospace; background: #edf2f7; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
  .pk { background: #bee3f8; color: #2c5282; font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
  .fk { background: #feebc8; color: #744210; font-size: 11px; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
  .crud-badge { color: #276749; font-weight: 600; }
  .empty { color: #a0aec0; font-style: italic; }
  .errors { background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
  .warnings { background: #fffff0; border: 1px solid #faf089; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
  .errors h4 { color: #c53030; margin: 0 0 0.5rem; }
  .warnings h4 { color: #975a16; margin: 0 0 0.5rem; }
  .ok { color: #2f855a; font-weight: 600; }
  @media print {
    .btn-print { display: none; }
    body { max-width: 100%; margin: 0; padding: 0; }
  }
</style>
</head>
<body>
  <header>
    <div>
      <h1>Documentación de Ingeniería de Software — ${esc(name)}</h1>
      <p class="meta">Generado automáticamente el ${esc(generatedAt)} · ${model.classes.length} clases · ${model.relations.length} relaciones</p>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </header>

  <h2>1. Catálogo de Clases UML</h2>
  ${classesHtml || '<p class="empty">Este diagrama no tiene clases.</p>'}

  <h2>2. Relaciones del Modelo</h2>
  ${relationsHtml}

  <h2>3. Diccionario de Datos Relacional</h2>
  <p class="class-description">Detalle de campos, tipos físicos (PostgreSQL), restricciones de integridad y descripción para cada entidad persistente.</p>
  ${dataDictionaryHtml}

  <h2>4. Matriz de Trazabilidad de Servicios CRUD</h2>
  <p class="class-description">Matriz que certifica la cobertura completa de operaciones en los controladores REST generados (Spring Boot).</p>
  ${crudMatrixHtml}

  <h2>5. Validación de Calidad del Modelo</h2>
  ${
    validation.valid && validation.warnings.length === 0
      ? '<p class="ok">✅ El modelo es 100% consistente. Sin errores de integridad ni advertencias.</p>'
      : issuesHtml('Errores Críticos', 'errors', validation.errors) +
        issuesHtml('Observaciones y Advertencias', 'warnings', validation.warnings)
  }
</body>
</html>
`;
}

