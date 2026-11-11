import type { UmlClass, UmlModel } from '../../diagrams/uml.types.js';
import { capitalize, toJavaType } from '../java-type.util.js';
import { findRealizedInterfaces, findSuperclass, resolveRelationFields } from '../relations.util.js';
import { parseParams } from './interface.template.js';

export function renderEntity(
  cls: UmlClass,
  model: UmlModel,
  packageName: string,
): string {
  const superclass = findSuperclass(cls, model);
  const relationFields = resolveRelationFields(cls, model);
  const enumClassNames = new Set(
    model.classes.filter((c) => c.stereotype === 'enum').map((c) => c.name),
  );

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
    if (field.pairFieldName) {
      imports.add('com.fasterxml.jackson.annotation.JsonIgnoreProperties');
    }
  }
  for (const attr of cls.attributes) {
    const javaType = toJavaType(attr.type);
    if (javaType === 'LocalDate') imports.add('java.time.LocalDate');
    if (javaType === 'LocalDateTime') imports.add('java.time.LocalDateTime');
    if (javaType === 'BigDecimal') imports.add('java.math.BigDecimal');
    if (javaType === 'UUID') imports.add('java.util.UUID');
    if (enumClassNames.has(attr.type)) {
      imports.add('jakarta.persistence.Enumerated');
      imports.add('jakarta.persistence.EnumType');
      imports.add(`${packageName}.model.${attr.type}`);
    }
  }

  const idAttribute = cls.attributes.find((a) => a.isPrimaryKey);
  const idJavaType = idAttribute ? toJavaType(idAttribute.type) : 'Long';

  const fields = cls.attributes
    .filter((a) => !a.isPrimaryKey)
    .map((attr) => {
      const annotation = enumClassNames.has(attr.type)
        ? '    @Enumerated(EnumType.STRING)\n'
        : '';
      return `${annotation}    private ${toJavaType(attr.type)} ${attr.name};`;
    })
    .join('\n');

  const relationFieldsCode = relationFields
    .map((f) => {
      const jsonAnnotation = f.pairFieldName
        ? [`    @JsonIgnoreProperties({"${f.pairFieldName}"})`]
        : [];
      const allAnnotations = [...jsonAnnotation, ...f.annotations.map((a) => `    ${a}`)];
      return `\n${allAnnotations.join('\n')}\n    private ${f.javaType} ${f.fieldName};`;
    })
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

  // UML InterfaceRealization → "implements". Each interface operation gets a stub unless a
  // generated accessor already has that name, so the project compiles as generated.
  const interfaces = findRealizedInterfaces(cls, model);
  interfaces.forEach((i) => imports.add(`${packageName}.model.${i.name}`));
  const generatedMethodNames = new Set<string>(superclass ? [] : ['getId', 'setId']);
  for (const { name, type } of allFields) {
    generatedMethodNames.add(`${type === 'Boolean' ? 'is' : 'get'}${capitalize(name)}`);
    generatedMethodNames.add(`set${capitalize(name)}`);
  }
  const isAbstract = cls.stereotype === 'abstract';
  const interfaceStubs = isAbstract
    ? '' // an abstract class may leave the interface's operations to its subclasses
    : interfaces
        .flatMap((i) => i.operations ?? [])
        .filter((op, idx, all) => all.findIndex((o) => o.name === op.name) === idx)
        .filter((op) => !generatedMethodNames.has(op.name))
        .map((op) => {
          const returnType = toJavaType(op.returnType);
          return [
            '',
            '',
            `    @Override`,
            `    public ${returnType} ${op.name}(${parseParams(op.parameters)}) {`,
            `        // TODO: implementar la operación de la interfaz`,
            `        throw new UnsupportedOperationException("${op.name} no implementado");`,
            `    }`,
          ].join('\n');
        })
        .join('');

  const classKeyword = isAbstract ? 'public abstract class' : 'public class';
  const extendsClause = superclass ? ` extends ${superclass.name}` : '';
  const implementsClause = interfaces.length
    ? ` implements ${interfaces.map((i) => i.name).join(', ')}`
    : '';
  const classHeader = `${classKeyword} ${cls.name}${extendsClause}${implementsClause} {`;

  // Inheritance follows OMT's "one table per class": the root of a hierarchy
  // declares JOINED, and every class (root or subclass) gets its own table,
  // joined to its parent's by the shared primary key.
  const isHierarchyRoot =
    !superclass &&
    model.relations.some((r) => r.type === 'INHERITANCE' && r.targetClassId === cls.id);
  if (isHierarchyRoot) {
    imports.add('jakarta.persistence.Inheritance');
    imports.add('jakarta.persistence.InheritanceType');
  }
  const tableAnnotation =
    (isHierarchyRoot ? '@Inheritance(strategy = InheritanceType.JOINED)\n' : '') +
    `@Table(name = "${entityTableName(cls.name)}")\n`;

  return `package ${packageName}.entity;

${[...imports].sort().map((i) => `import ${i};`).join('\n')}

@Entity
${tableAnnotation}${classHeader}

${idField}${fields}${relationFieldsCode}

    public ${cls.name}() {
    }

${idGetterSetter}${gettersSetters}${interfaceStubs}
}
`;
}

function toSnakeCase(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Table of an entity class; data.sql uses the same name. */
export function entityTableName(className: string): string {
  return `${toSnakeCase(className)}s`;
}
