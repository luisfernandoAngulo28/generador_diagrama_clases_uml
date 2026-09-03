import type { UmlClass } from '../../diagrams/uml.types.js';
import { toJavaType } from '../java-type.util.js';

/**
 * Renders a class with stereotype «interface» as a plain Java interface:
 * one method signature per operation, no fields, no JPA annotations —
 * interfaces in this tool are a pure contract, not a persisted entity.
 */
export function renderInterface(cls: UmlClass, packageName: string): string {
  const methods = (cls.operations ?? [])
    .map((op) => `    ${toJavaType(op.returnType)} ${op.name}(${parseParams(op.parameters)});`)
    .join('\n\n');

  return `package ${packageName}.model;

public interface ${cls.name} {
${methods}
}
`;
}

/** Best-effort translation of the free-text "id: Long, nombre: String" parameter field into Java. */
function parseParams(parameters: string | undefined): string {
  if (!parameters?.trim()) return '';
  return parameters
    .split(',')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((param) => {
      const [name, type] = param.split(':').map((s) => s.trim());
      if (!name) return null;
      return `${type ? toJavaType(type) : 'Object'} ${name}`;
    })
    .filter((p): p is string => p !== null)
    .join(', ');
}
