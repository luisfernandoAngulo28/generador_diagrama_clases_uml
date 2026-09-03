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

/**
 * Renders a self-contained HTML documentation report for a diagram:
 * class list with attributes, relation list, and the current logical
 * validation result. Mirrors the "auto-generated model documentation"
 * capability of traditional CASE tools (e.g. EA's Model Documents).
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
        <thead><tr><th>Origen</th><th>Tipo</th><th>Destino</th></tr></thead>
        <tbody>
          ${model.relations
            .map(
              (r) => `<tr>
              <td>${esc(findClassName(model, r.sourceClassId))}</td>
              <td>${esc(RELATION_LABELS[r.type] ?? r.type)}</td>
              <td>${esc(findClassName(model, r.targetClassId))}</td>
            </tr>`,
            )
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
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a202c; background: #ffffff; }
  h1 { border-bottom: 3px solid #2b6cb0; padding-bottom: 0.5rem; }
  .meta { color: #718096; font-size: 13px; margin-bottom: 2rem; }
  h2 { margin-top: 2.5rem; color: #2d3748; }
  .class-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
  .class-card table.operations { margin-top: 0.75rem; }
  .class-description { color: #4a5568; font-size: 13px; margin: 0 0 0.75rem; }
  .class-card h3 { margin: 0 0 0.75rem; }
  .stereotype { color: #718096; font-style: italic; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #edf2f7; }
  th { color: #718096; font-weight: 600; }
  .pk { background: #bee3f8; color: #2c5282; font-size: 11px; padding: 1px 5px; border-radius: 4px; }
  .empty { color: #a0aec0; font-style: italic; }
  .errors { background: #fff5f5; border: 1px solid #feb2b2; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
  .warnings { background: #fffff0; border: 1px solid #faf089; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
  .errors h4 { color: #c53030; margin: 0 0 0.5rem; }
  .warnings h4 { color: #975a16; margin: 0 0 0.5rem; }
  .ok { color: #2f855a; font-weight: 600; }
</style>
</head>
<body>
  <h1>Documentación del diagrama: ${esc(name)}</h1>
  <p class="meta">Generado automáticamente el ${esc(generatedAt)} — ${model.classes.length} clase(s), ${model.relations.length} relación(es).</p>

  <h2>Clases</h2>
  ${classesHtml || '<p class="empty">Este diagrama no tiene clases.</p>'}

  <h2>Relaciones</h2>
  ${relationsHtml}

  <h2>Validación lógica</h2>
  ${
    validation.valid && validation.warnings.length === 0
      ? '<p class="ok">✅ Sin errores ni advertencias.</p>'
      : issuesHtml('Errores', 'errors', validation.errors) +
        issuesHtml('Advertencias', 'warnings', validation.warnings)
  }
</body>
</html>
`;
}
