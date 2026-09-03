import type { UmlClass } from '../../diagrams/uml.types.js';

/**
 * Renders a class with stereotype «enum» as a plain Java enum: each
 * attribute name becomes a literal (converted to UPPER_SNAKE_CASE, the
 * Java enum convention), ignoring type/visibility/PK — those fields
 * are meaningless for an enum literal.
 */
export function renderEnum(cls: UmlClass, packageName: string): string {
  const literals = cls.attributes.map((a) => toEnumLiteral(a.name));

  return `package ${packageName}.model;

public enum ${cls.name} {
${literals.map((l) => `    ${l}`).join(',\n')}
}
`;
}

function toEnumLiteral(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_');
}
