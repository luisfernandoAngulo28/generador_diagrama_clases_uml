import type { UmlClass, UmlModel } from '../../diagrams/uml.types.js';
import { capitalize, toJavaType } from '../java-type.util.js';
import { findSuperclass, resolveRelationFields } from '../relations.util.js';

export function renderEntity(
  cls: UmlClass,
  model: UmlModel,
  packageName: string,
): string {
  const superclass = findSuperclass(cls, model);
  const relationFields = resolveRelationFields(cls, model);

  const imports = new Set<string>([
    'jakarta.persistence.Entity',
    'jakarta.persistence.Table',
  ]);
  if (!superclass) {
    imports.add('jakarta.persistence.Id');
    imports.add('jakarta.persistence.GeneratedValue');
    imports.add('jakarta.persistence.GenerationType');
  }
  for (const field of relationFields) {
    field.imports.forEach((i) => imports.add(i));
  }
  for (const attr of cls.attributes) {
    const javaType = toJavaType(attr.type);
    if (javaType === 'LocalDate') imports.add('java.time.LocalDate');
    if (javaType === 'LocalDateTime') imports.add('java.time.LocalDateTime');
    if (javaType === 'BigDecimal') imports.add('java.math.BigDecimal');
    if (javaType === 'UUID') imports.add('java.util.UUID');
  }

  const idAttribute = cls.attributes.find((a) => a.isPrimaryKey);
  const idJavaType = idAttribute ? toJavaType(idAttribute.type) : 'Long';

  const fields = cls.attributes
    .filter((a) => !a.isPrimaryKey)
    .map((attr) => `    private ${toJavaType(attr.type)} ${attr.name};`)
    .join('\n');

  const relationFieldsCode = relationFields
    .map(
      (f) =>
        `\n${f.annotations.map((a) => `    ${a}`).join('\n')}\n    private ${f.javaType} ${f.fieldName};`,
    )
    .join('\n');

  const idField = superclass
    ? ''
    : `    @Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    private ${idJavaType} id;\n\n`;

  const allFields = [
    ...(idAttribute ? [] : []),
    ...cls.attributes.filter((a) => !a.isPrimaryKey),
    ...relationFields.map((f) => ({ name: f.fieldName, type: f.javaType })),
  ];

  const gettersSetters = allFields
    .map(({ name, type }) => {
      const cap = capitalize(name);
      const boolPrefix = type === 'Boolean' ? 'is' : 'get';
      return [
        `    public ${type} ${boolPrefix}${cap}() {`,
        `        return ${name};`,
        `    }`,
        '',
        `    public void set${cap}(${type} ${name}) {`,
        `        this.${name} = ${name};`,
        `    }`,
      ].join('\n');
    })
    .join('\n\n');

  const idGetterSetter = superclass
    ? ''
    : [
        `    public ${idJavaType} getId() {`,
        `        return id;`,
        `    }`,
        '',
        `    public void setId(${idJavaType} id) {`,
        `        this.id = id;`,
        `    }`,
        '',
        '',
      ].join('\n');

  const classHeader = superclass
    ? `public class ${cls.name} extends ${superclass.name} {`
    : `public class ${cls.name} {`;

  const tableAnnotation = superclass ? '' : `@Table(name = "${toSnakeCase(cls.name)}s")\n`;

  return `package ${packageName}.entity;

${[...imports].sort().map((i) => `import ${i};`).join('\n')}

@Entity
${tableAnnotation}${classHeader}

${idField}${fields}${relationFieldsCode}

    public ${cls.name}() {
    }

${idGetterSetter}${gettersSetters}
}
`;
}

function toSnakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
