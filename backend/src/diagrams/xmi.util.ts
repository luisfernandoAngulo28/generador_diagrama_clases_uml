import type { UmlModel, UmlRelation, RelationType } from './uml.types.js';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeId(id: string): string {
  return `id_${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

interface EndMultiplicity {
  lower: string;
  upper: string;
}

/**
 * Multiplicity of the END AT THE TARGET class, as seen from the source
 * ("how many targets does one source relate to").
 */
function targetMultiplicity(type: RelationType): EndMultiplicity {
  switch (type) {
    case 'ONE_TO_ONE':
      return { lower: '1', upper: '1' };
    case 'ONE_TO_MANY':
    case 'AGGREGATION':
    case 'COMPOSITION':
      // aggregation/composition: the source is the whole (diamond end), the target the parts
      return { lower: '0', upper: '*' };
    case 'MANY_TO_ONE':
      return { lower: '1', upper: '1' };
    case 'MANY_TO_MANY':
      return { lower: '0', upper: '*' };
    default:
      return { lower: '0', upper: '1' };
  }
}

/** Multiplicity of the END AT THE SOURCE class, as seen from the target. */
function sourceMultiplicity(type: RelationType): EndMultiplicity {
  switch (type) {
    case 'ONE_TO_ONE':
      return { lower: '1', upper: '1' };
    case 'ONE_TO_MANY':
    case 'COMPOSITION':
      return { lower: '1', upper: '1' };
    case 'AGGREGATION':
      // a shared part may exist without its whole
      return { lower: '0', upper: '1' };
    case 'MANY_TO_ONE':
    case 'ASSOCIATION':
      return { lower: '0', upper: '*' };
    case 'MANY_TO_MANY':
      return { lower: '0', upper: '*' };
    default:
      return { lower: '0', upper: '1' };
  }
}

function aggregationKind(type: RelationType): string | null {
  if (type === 'COMPOSITION') return 'composite';
  if (type === 'AGGREGATION') return 'shared';
  return null;
}

const PACKAGE_ID = 'pkg_diagrama';

/**
 * Type of an attribute or return value as a UML primitive reference — the way Enterprise
 * Architect writes it. Declaring each type as a packagedElement instead made EA import
 * "Long", "String"… as extra elements of the package.
 */
function typeRef(typeName: string): string {
  return `<type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#${encodeURIComponent(typeName)}"/>`;
}

function isRealizationRel(rel: UmlRelation, interfaceIds: Set<string>): boolean {
  return (
    rel.type === 'INHERITANCE' &&
    interfaceIds.has(rel.targetClassId) &&
    !interfaceIds.has(rel.sourceClassId)
  );
}

/** xmi:id of the UML element that represents a relation (see renderXmi). */
function relationElementId(rel: UmlRelation, interfaceIds: Set<string>): string {
  const relId = sanitizeId(rel.id);
  if (rel.type !== 'INHERITANCE') return relId;
  return isRealizationRel(rel, interfaceIds) ? `real_${relId}` : `gen_${relId}`;
}

/** Enterprise Architect connector type ("ea_type") and subtype of a relation. */
function eaConnectorType(rel: UmlRelation, interfaceIds: Set<string>): { type: string; subtype?: string } {
  switch (rel.type) {
    case 'INHERITANCE':
      return { type: isRealizationRel(rel, interfaceIds) ? 'Realisation' : 'Generalization' };
    case 'DEPENDENCY':
      return { type: 'Dependency' };
    case 'AGGREGATION':
      return { type: 'Aggregation', subtype: 'Weak' };
    case 'COMPOSITION':
      return { type: 'Aggregation', subtype: 'Strong' };
    default:
      return { type: 'Association' };
  }
}

/**
 * EA's own <connectors> list. When the file declares Enterprise Architect as exporter (needed
 * for EA to rebuild the diagram), EA reads relations from here, not from the UML elements.
 */
function renderEaConnectors(model: UmlModel, interfaceIds: Set<string>): string {
  const names = new Map(model.classes.map((c) => [c.id, c]));
  const kind = (id: string) => (names.get(id)?.stereotype === 'interface' ? 'Interface' : 'Class');
  return model.relations
    .filter((rel) => names.has(rel.sourceClassId) && names.has(rel.targetClassId))
    .map((rel) => {
      const { type, subtype } = eaConnectorType(rel, interfaceIds);
      const withMultiplicity = MULTIPLICITY_TYPES.has(rel.type);
      const agg = aggregationKind(rel.type);
      const end = (tag: 'source' | 'target', classId: string, role: string | undefined, mult: EndMultiplicity, aggregation: string) => {
        const multiplicity = withMultiplicity
          ? ` multiplicity="${mult.lower === mult.upper ? mult.lower : `${mult.lower}..${mult.upper}`}"`
          : '';
        const roleName = role ? ` name="${escapeXml(role)}"` : '';
        return `        <${tag} xmi:idref="${sanitizeId(classId)}">
          <model type="${kind(classId)}" name="${escapeXml(names.get(classId)!.name)}"/>
          <role${roleName} visibility="Public"/>
          <type${multiplicity} aggregation="${aggregation}"/>
        </${tag}>`;
      };
      const direction = type === 'Association' || type === 'Aggregation' ? 'Unspecified' : 'Source -&gt; Destination';
      return `      <connector xmi:idref="${relationElementId(rel, interfaceIds)}">
${end('source', rel.sourceClassId, rel.sourceRole, sourceMultiplicity(rel.type), agg ?? 'none')}
${end('target', rel.targetClassId, rel.targetRole, targetMultiplicity(rel.type), 'none')}
        <properties ea_type="${type}"${subtype ? ` subtype="${subtype}"` : ''} direction="${direction}"/>
      </connector>`;
    })
    .join('\n');
}

const MULTIPLICITY_TYPES = new Set<RelationType>([
  'ASSOCIATION',
  'AGGREGATION',
  'COMPOSITION',
  'ONE_TO_ONE',
  'ONE_TO_MANY',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
]);

/** The free-text "id: Long, nombre: String" parameter field, split into name/type pairs. */
function splitParams(parameters: string | undefined): { name: string; type: string }[] {
  return (parameters ?? '')
    .split(',')
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((param) => {
      const [name, type] = param.split(':').map((s) => s.trim());
      return { name: name || 'param', type: type || 'Object' };
    });
}

/** Canvas size of a class box, close to how the editor draws it. */
function boxSize(cls: UmlModel['classes'][number]): { width: number; height: number } {
  const rows = cls.attributes.length + (cls.operations?.length ?? 0);
  return { width: 180, height: Math.max(70, 44 + rows * 16) };
}

/**
 * Enterprise Architect diagram extension (the <xmi:Extension> block EA itself exports): without
 * it EA imports the classes and relations but no diagram, so nothing appears on a canvas. Each
 * class keeps the position it has in the editor; connectors are listed so EA draws them.
 */
function renderEaDiagram(diagramName: string, model: UmlModel, interfaceIds: Set<string>): string {
  const placed = model.classes.map((cls, i) => ({
    cls,
    x: cls.position?.x ?? 80 + (i % 4) * 260,
    y: cls.position?.y ?? 80 + Math.floor(i / 4) * 220,
  }));
  // EA's canvas starts at (0,0): shift the layout so the top-left class sits at (40,40).
  const minX = Math.min(0, ...placed.map((p) => p.x));
  const minY = Math.min(0, ...placed.map((p) => p.y));

  const classRows = placed.map(({ cls, x, y }, i) => {
    const { width, height } = boxSize(cls);
    const left = Math.round(x - minX + 40);
    const top = Math.round(y - minY + 40);
    return `          <element geometry="Left=${left};Top=${top};Right=${left + width};Bottom=${top + height};" subject="${sanitizeId(cls.id)}" seqno="${i + 1}"/>`;
  });

  const connectorRows = model.relations.map(
    (rel) =>
      `          <element geometry="SX=0;SY=0;EX=0;EY=0;" subject="${relationElementId(rel, interfaceIds)}" style="Hidden=0;"/>`,
  );

  return `  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
    <connectors>
${renderEaConnectors(model, interfaceIds)}
    </connectors>
    <diagrams>
      <diagram xmi:id="diagram_1">
        <model package="${PACKAGE_ID}" localID="1" owner="${PACKAGE_ID}"/>
        <properties name="${escapeXml(diagramName)}" type="Logical"/>
        <elements>
${[...classRows, ...connectorRows].join('\n')}
        </elements>
      </diagram>
    </diagrams>
  </xmi:Extension>`;
}

export function renderXmi(diagramName: string, model: UmlModel): string {
  const inheritance = model.relations.filter((r) => r.type === 'INHERITANCE');
  const interfaceIds = new Set(
    model.classes.filter((c) => c.stereotype === 'interface').map((c) => c.id),
  );
  const dependencies = model.relations.filter((r) => r.type === 'DEPENDENCY');
  const nonInheritance = model.relations.filter(
    (r) => r.type !== 'INHERITANCE' && r.type !== 'DEPENDENCY',
  );

  const classElements = model.classes
    .map((cls) => {
      const classId = sanitizeId(cls.id);
      const isEnum = cls.stereotype === 'enum';
      const isInterface = cls.stereotype === 'interface';
      const xmiType = isEnum ? 'uml:Enumeration' : isInterface ? 'uml:Interface' : 'uml:Class';
      const abstractAttr = cls.stereotype === 'abstract' ? ' isAbstract="true"' : '';

      const generalizations = isEnum
        ? ''
        : inheritance
            .filter((r) => r.sourceClassId === cls.id)
            // A class → «interface» relation is a realization, written at package level below.
            .filter((r) => !isRealizationRel(r, interfaceIds))
            .map(
              (r) =>
                `      <generalization xmi:id="gen_${sanitizeId(r.id)}" xmi:type="uml:Generalization" general="${sanitizeId(r.targetClassId)}"/>`,
            )
            .join('\n');

      const attributes = isEnum
        ? cls.attributes
            .map(
              (attr) =>
                `      <ownedLiteral xmi:id="${classId}_${escapeXml(attr.name)}" name="${escapeXml(attr.name)}"/>`,
            )
            .join('\n')
        : isInterface
          ? ''
          : cls.attributes
              .map(
                (attr) =>
                  `      <ownedAttribute xmi:type="uml:Property" xmi:id="${classId}_${escapeXml(attr.name)}" name="${escapeXml(attr.name)}" visibility="${attr.visibility}" isOrdered="false" isUnique="true">
        <lowerValue xmi:type="uml:LiteralInteger" value="1"/>
        <upperValue xmi:type="uml:LiteralInteger" value="1"/>
        ${typeRef(attr.type)}
      </ownedAttribute>`,
              )
              .join('\n');

      const operations = isEnum
        ? ''
        : (cls.operations ?? [])
            .map((op) => {
              const opId = `${classId}_op_${sanitizeId(op.name)}`;
              const inParams = splitParams(op.parameters)
                .map(
                  (p, i) => `        <ownedParameter xmi:id="${opId}_p${i}" name="${escapeXml(p.name)}" direction="in">
          ${typeRef(p.type)}
        </ownedParameter>`,
                )
                .join('\n');
              return `      <ownedOperation xmi:id="${opId}" name="${escapeXml(op.name)}" visibility="${op.visibility}">
${inParams}${inParams ? '\n' : ''}        <ownedParameter xmi:id="${opId}_return" name="return" direction="return">
          ${typeRef(op.returnType)}
        </ownedParameter>
      </ownedOperation>`;
            })
            .join('\n');

      return `    <packagedElement xmi:type="${xmiType}" xmi:id="${classId}" name="${escapeXml(cls.name)}"${abstractAttr}>
${attributes}${attributes ? '\n' : ''}${operations}${operations ? '\n' : ''}${generalizations}
    </packagedElement>`;
    })
    .join('\n');

  const associationElements = nonInheritance
    .map((rel: UmlRelation) => {
      const relId = sanitizeId(rel.id);
      const sourceId = sanitizeId(rel.sourceClassId);
      const targetId = sanitizeId(rel.targetClassId);
      const srcMult = sourceMultiplicity(rel.type);
      const tgtMult = targetMultiplicity(rel.type);
      const aggregation = aggregationKind(rel.type);
      const sourceEndAttrs =
        (aggregation ? ` aggregation="${aggregation}"` : '') +
        (rel.sourceRole ? ` name="${escapeXml(rel.sourceRole)}"` : '');
      const targetEndAttrs = rel.targetRole ? ` name="${escapeXml(rel.targetRole)}"` : '';

      return `    <packagedElement xmi:type="uml:Association" xmi:id="${relId}">
      <memberEnd xmi:idref="${relId}_src"/>
      <memberEnd xmi:idref="${relId}_tgt"/>
      <ownedEnd xmi:id="${relId}_src" type="${sourceId}"${sourceEndAttrs}>
        <lowerValue xmi:type="uml:LiteralInteger" value="${srcMult.lower}"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${srcMult.upper}"/>
      </ownedEnd>
      <ownedEnd xmi:id="${relId}_tgt" type="${targetId}"${targetEndAttrs}>
        <lowerValue xmi:type="uml:LiteralInteger" value="${tgtMult.lower}"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${tgtMult.upper}"/>
      </ownedEnd>
    </packagedElement>`;
    })
    .join('\n');

  // UML 2.5 §10.4 realization of an interface, as Enterprise Architect exports it: a
  // package-level uml:Realization (EA draws it dashed with a hollow triangle).
  const realizationElements = inheritance
    .filter((r) => isRealizationRel(r, interfaceIds))
    .map(
      (r) =>
        `    <packagedElement xmi:type="uml:Realization" xmi:id="real_${sanitizeId(r.id)}" client="${sanitizeId(r.sourceClassId)}" supplier="${sanitizeId(r.targetClassId)}"/>`,
    )
    .join('\n');

  const dependencyElements = dependencies
    .map((rel: UmlRelation) => {
      const relId = sanitizeId(rel.id);
      return `    <packagedElement xmi:type="uml:Dependency" xmi:id="${relId}" name="dependencia" client="${sanitizeId(rel.sourceClassId)}" supplier="${sanitizeId(rel.targetClassId)}"/>`;
    })
    .join('\n');

  // Every element lives in one package, which owns the class diagram that Enterprise Architect
  // rebuilds from the extension below.
  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <xmi:Documentation exporter="Enterprise Architect" exporterVersion="6.5"/>
  <uml:Model xmi:type="uml:Model" xmi:id="model_1" name="EA_Model">
  <packagedElement xmi:type="uml:Package" xmi:id="${PACKAGE_ID}" name="${escapeXml(diagramName)}">
${classElements}
${associationElements}
${realizationElements}
${dependencyElements}
  </packagedElement>
  </uml:Model>
${renderEaDiagram(diagramName, model, interfaceIds)}
</xmi:XMI>
`;
}
