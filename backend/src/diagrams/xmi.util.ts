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

export { sourceMultiplicity as sourceEndMultiplicity, targetMultiplicity as targetEndMultiplicity };

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
      const nav = withMultiplicity ? rel.navigability : undefined;
      const end = (
        tag: 'source' | 'target',
        classId: string,
        role: string | undefined,
        mult: EndMultiplicity,
        aggregation: string,
        navigable: boolean,
      ) => {
        const multiplicity = withMultiplicity ? ` multiplicity="${formatEnd(mult)}"` : '';
        const roleName = role ? ` name="${escapeXml(role)}"` : '';
        const navStyle = nav ? (navigable ? 'Navigable' : 'Non-Navigable') : 'Unspecified';
        return `        <${tag} xmi:idref="${sanitizeId(classId)}">
          <model type="${kind(classId)}" name="${escapeXml(names.get(classId)!.name)}"/>
          <role${roleName} visibility="Public"/>
          <type${multiplicity} aggregation="${aggregation}"/>
          <style value="Navigable=${navStyle};Owned=0;"/>
        </${tag}>`;
      };
      const direction =
        nav === 'SOURCE_TO_TARGET'
          ? 'Source -&gt; Destination'
          : nav === 'TARGET_TO_SOURCE'
            ? 'Destination -&gt; Source'
            : type === 'Association' || type === 'Aggregation'
              ? 'Unspecified'
              : 'Source -&gt; Destination';
      // UML 2.5 association class (EA: subtype "Class" + the class id in extendedProperties).
      const assocClass =
        type === 'Association' && rel.associationClassId && names.has(rel.associationClassId)
          ? sanitizeId(rel.associationClassId)
          : undefined;
      return `      <connector xmi:idref="${relationElementId(rel, interfaceIds)}">
${end('source', rel.sourceClassId, rel.sourceRole, toEnd(rel.sourceMultiplicity, sourceMultiplicity(rel.type)), agg ?? 'none', nav === 'TARGET_TO_SOURCE')}
${end('target', rel.targetClassId, rel.targetRole, toEnd(rel.targetMultiplicity, targetMultiplicity(rel.type)), 'none', nav === 'SOURCE_TO_TARGET')}
        <properties ea_type="${type}"${assocClass ? ' subtype="Class"' : subtype ? ` subtype="${subtype}"` : ''} direction="${direction}"/>${
          assocClass ? `\n        <extendedProperties associationclass="${assocClass}"/>` : ''
        }
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

/** A typed multiplicity ("2..5", "*", "3") as lower/upper; falls back to the one implied by the type. */
function toEnd(custom: string | undefined, fallback: EndMultiplicity): EndMultiplicity {
  if (!custom) return fallback;
  const [lower, upper] = custom.split('..');
  if (upper === undefined) return lower === '*' ? { lower: '0', upper: '*' } : { lower, upper: lower };
  return { lower, upper };
}

export function formatEnd(m: EndMultiplicity): string {
  return m.lower === m.upper ? m.lower : `${m.lower}..${m.upper}`;
}

/** UML 2.5 lowerValue/upperValue of an attribute (default 1..1). */
function attributeBounds(multiplicity: string | undefined): string {
  const { lower, upper } = toEnd(multiplicity, { lower: '1', upper: '1' });
  const upperType = upper === '*' ? 'uml:LiteralUnlimitedNatural' : 'uml:LiteralInteger';
  return `<lowerValue xmi:type="uml:LiteralInteger" value="${lower}"/>
        <upperValue xmi:type="${upperType}" value="${upper}"/>`;
}

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

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

  // EA's element entries: nType 17 marks an association class, and EA reads each operation's
  // return type, static and abstract flags from here (not from the UML ownedOperation).
  const classIds = new Set(model.classes.map((c) => c.id));
  const assocClassIds = new Set(
    model.relations
      .map((r) => r.associationClassId)
      .filter((id): id is string => !!id && classIds.has(id)),
  );
  const assocClassElements = model.classes
    .filter((cls) => assocClassIds.has(cls.id) || (cls.stereotype !== 'enum' && cls.operations?.length))
    .map((cls) => {
      const classId = sanitizeId(cls.id);
      const kind = cls.stereotype === 'interface' ? 'Interface' : 'Class';
      const operations =
        cls.stereotype === 'enum'
          ? []
          : (cls.operations ?? []).map((op, pos) => {
              const opId = `${classId}_op_${sanitizeId(op.name)}`;
              const params = splitParams(op.parameters)
                .map(
                  (p, i) => `            <parameter xmi:idref="${opId}_p${i}" visibility="public">
              <properties pos="${i}" type="${escapeXml(p.type)}" const="false"/>
            </parameter>`,
                )
                .join('\n');
              return `        <operation xmi:idref="${opId}" name="${escapeXml(op.name)}" scope="${capitalize(op.visibility)}">
          <properties position="${pos}"/>
          <type type="${escapeXml(op.returnType)}" const="false" static="${!!op.isStatic}" isAbstract="${!!op.isAbstract}" concurrency="Sequential" returnarray="0" pure="0" isQuery="false"/>
          <parameters>
${params}
          </parameters>
        </operation>`;
            });
      return `      <element xmi:idref="${classId}" xmi:type="uml:${kind}" name="${escapeXml(cls.name)}" scope="public">
        <properties sType="${kind}" nType="${assocClassIds.has(cls.id) ? 17 : 0}" scope="public"${
          cls.stereotype === 'abstract' ? ' isAbstract="true"' : ''
        }/>${operations.length ? `\n        <operations>\n${operations.join('\n')}\n        </operations>` : ''}
      </element>`;
    })
    .join('\n');

  return `  <xmi:Extension extender="Enterprise Architect" extenderID="6.5">
    <elements>
${assocClassElements}
    </elements>
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
  </xmi:Extension>
  <xmi:Extension extender="Diagramador UML">
${renderToolExtension(model)}
  </xmi:Extension>`;
}

/**
 * The editor's own data that plain UML can't carry losslessly: the relation type (ONE_TO_MANY,
 * MANY_TO_MANY…, which typed multiplicities would otherwise hide) and the association class.
 * Other tools ignore an extension they don't know; parseXmi reads it back.
 */
function renderToolExtension(model: UmlModel): string {
  return model.relations
    .map(
      (rel) =>
        `    <relation xmi:idref="${sanitizeId(rel.id)}" type="${rel.type}"${
          rel.associationClassId ? ` associationClass="${sanitizeId(rel.associationClassId)}"` : ''
        }/>`,
    )
    .join('\n');
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
                  `      <ownedAttribute xmi:type="uml:Property" xmi:id="${classId}_${escapeXml(attr.name)}" name="${escapeXml(attr.name)}" visibility="${attr.visibility}" isStatic="${!!attr.isStatic}" isDerived="${!!attr.isDerived}" isOrdered="false" isUnique="true">
        ${attributeBounds(attr.multiplicity)}
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
              const flags =
                (op.isStatic ? ' isStatic="true"' : '') + (op.isAbstract ? ' isAbstract="true"' : '');
              return `      <ownedOperation xmi:id="${opId}" name="${escapeXml(op.name)}" visibility="${op.visibility}"${flags}>
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
      const srcMult = toEnd(rel.sourceMultiplicity, sourceMultiplicity(rel.type));
      const tgtMult = toEnd(rel.targetMultiplicity, targetMultiplicity(rel.type));
      // UML 2.5: the navigable end is listed as navigableOwnedEnd.
      const navigableEnd =
        rel.navigability === 'SOURCE_TO_TARGET'
          ? `\n      <navigableOwnedEnd xmi:idref="${relId}_tgt"/>`
          : rel.navigability === 'TARGET_TO_SOURCE'
            ? `\n      <navigableOwnedEnd xmi:idref="${relId}_src"/>`
            : '';
      const aggregation = aggregationKind(rel.type);
      const sourceEndAttrs =
        (aggregation ? ` aggregation="${aggregation}"` : '') +
        (rel.sourceRole ? ` name="${escapeXml(rel.sourceRole)}"` : '');
      const targetEndAttrs = rel.targetRole ? ` name="${escapeXml(rel.targetRole)}"` : '';

      return `    <packagedElement xmi:type="uml:Association" xmi:id="${relId}">
      <memberEnd xmi:idref="${relId}_src"/>
      <memberEnd xmi:idref="${relId}_tgt"/>${navigableEnd}
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
