import { XMLParser } from 'fast-xml-parser';
import {
  formatEnd,
  sourceEndMultiplicity as defaultSourceEnd,
  targetEndMultiplicity as defaultTargetEnd,
} from './xmi.util.js';
import type {
  RelationType,
  UmlAttribute,
  UmlClass,
  UmlModel,
  UmlOperation,
  UmlRelation,
  Visibility,
} from './uml.types.js';

const VISIBILITIES: Visibility[] = ['public', 'private', 'protected', 'package'];
const RELATION_TYPES: RelationType[] = [
  'ASSOCIATION',
  'AGGREGATION',
  'COMPOSITION',
  'INHERITANCE',
  'ONE_TO_ONE',
  'ONE_TO_MANY',
  'MANY_TO_ONE',
  'MANY_TO_MANY',
  'DEPENDENCY',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type XmlNode = any;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function toVisibility(value: unknown): Visibility {
  return typeof value === 'string' && (VISIBILITIES as string[]).includes(value)
    ? (value as Visibility)
    : 'public';
}

/** "lower..upper" of an association end or attribute ("" when the file has none). */
function endText(end: XmlNode | undefined): string {
  const lower = end?.lowerValue?.['@_value'];
  const upper = end?.upperValue?.['@_value'];
  if (lower === undefined && upper === undefined) return '';
  const lo = String(lower ?? '0');
  const up = upper === undefined ? lo : String(upper) === '-1' ? '*' : String(upper);
  return lo === up ? lo : `${lo}..${up}`;
}

/** An attribute's multiplicity when it is not the default 1. */
function attributeMultiplicity(attr: XmlNode): { multiplicity?: string } {
  const text = endText(attr);
  return text && text !== '1' ? { multiplicity: text } : {};
}

/** Infers a RelationType from end multiplicities when the file has no explicit hint (e.g. XMI from another tool). */
function inferMultiplicity(srcEnd: XmlNode, tgtEnd: XmlNode): RelationType {
  const srcUpper = srcEnd?.upperValue?.['@_value'];
  const tgtUpper = tgtEnd?.upperValue?.['@_value'];
  const srcLower = srcEnd?.lowerValue?.['@_value'];
  const tgtLower = tgtEnd?.lowerValue?.['@_value'];
  const srcMany = srcUpper === '*';
  const tgtMany = tgtUpper === '*';
  if (srcMany && tgtMany) return 'MANY_TO_MANY';
  if (!srcMany && tgtMany) return 'ONE_TO_MANY';
  // 0..* → 0..1 is a plain association; 0..* → 1 is many-to-one.
  if (srcMany && !tgtMany) return tgtLower === '0' ? 'ASSOCIATION' : 'MANY_TO_ONE';
  if (srcLower === '1' && tgtLower === '1') return 'ONE_TO_ONE';
  return 'ASSOCIATION';
}

/**
 * Parses a UML 2.x XMI document (as produced by renderXmi, or exported by tools like
 * Enterprise Architect / StarUML) into our internal UmlModel shape. Best-effort for
 * foreign XMI: unresolvable ends/types fall back to sensible defaults instead of throwing.
 */
export function parseXmi(xml: string): { name: string; model: UmlModel } {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  let doc: XmlNode;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new Error('El archivo no contiene XML válido.');
  }

  const xmiRoot = doc['xmi:XMI'] ?? doc.XMI;
  if (!xmiRoot) {
    throw new Error('El archivo no es un XMI válido: falta el elemento raíz <xmi:XMI>.');
  }
  const umlModel = xmiRoot['uml:Model'] ?? xmiRoot['Model'];
  if (!umlModel) {
    throw new Error('El archivo no es un XMI válido: falta el elemento <uml:Model>.');
  }

  // Enterprise Architect (and renderXmi, for EA) names the model "EA_Model" and puts the
  // diagram's elements in one top-level package: that package carries the real name.
  const topPackages = asArray<XmlNode>(umlModel.packagedElement).filter(
    (el) => el['@_xmi:type'] === 'uml:Package' && typeof el['@_name'] === 'string',
  );
  const modelName = typeof umlModel['@_name'] === 'string' ? umlModel['@_name'] : '';
  const diagramName: string =
    modelName && modelName !== 'EA_Model'
      ? modelName
      : topPackages.length === 1
        ? topPackages[0]['@_name']
        : modelName || 'Diagrama importado';
  // Flatten packagedElements recursively: Enterprise Architect nests classes inside a
  // <packagedElement xmi:type="uml:Package">, so a shallow read would miss them.
  const packagedElements: XmlNode[] = [];
  (function collect(node: XmlNode) {
    for (const el of asArray<XmlNode>(node.packagedElement)) {
      packagedElements.push(el);
      collect(el);
    }
  })(umlModel);

  const typeNames = new Map<string, string>();
  for (const el of packagedElements) {
    if (el['@_xmi:type'] === 'uml:PrimitiveType') {
      typeNames.set(el['@_xmi:id'], el['@_name'] ?? 'String');
    }
  }
  function resolveType(rawType: unknown): string {
    if (typeof rawType !== 'string' || !rawType) return 'String';
    return typeNames.get(rawType) ?? rawType.replace(/^type_/, '');
  }
  // Our format stores an attribute's type in @_type; Enterprise Architect uses a child
  // <type href=".../uml.xml#Integer"/> or <type xmi:idref="..."/> instead.
  function resolveAttrType(attr: XmlNode): string {
    if (typeof attr['@_type'] === 'string' && attr['@_type']) return resolveType(attr['@_type']);
    const t = attr.type as XmlNode | undefined;
    if (t) {
      const href = t['@_href'];
      if (typeof href === 'string' && href.includes('#')) {
        return decodeURIComponent(href.split('#').pop() as string);
      }
      const idref = t['@_xmi:idref'];
      if (typeof idref === 'string') return typeNames.get(idref) ?? 'String';
    }
    return 'String';
  }
  // An association end's target class: our format uses @_type; EA uses a child <type xmi:idref="..."/>.
  function resolveEndType(end: XmlNode): string | undefined {
    if (typeof end?.['@_type'] === 'string' && end['@_type']) return end['@_type'];
    const t = end?.type as XmlNode | undefined;
    if (t) {
      if (typeof t['@_xmi:idref'] === 'string') return t['@_xmi:idref'];
      if (typeof t['@_type'] === 'string') return t['@_type'];
    }
    return undefined;
  }

  // Our own extension (renderXmi): relation type and association class of each relation.
  const toolRelations = new Map<string, { type?: RelationType; associationClass?: string }>();
  for (const ext of asArray<XmlNode>(xmiRoot['xmi:Extension'])) {
    if (ext['@_extender'] !== 'Diagramador UML') continue;
    for (const r of asArray<XmlNode>(ext.relation)) {
      const id = r['@_xmi:idref'];
      if (typeof id !== 'string') continue;
      toolRelations.set(id, {
        type: (RELATION_TYPES as string[]).includes(r['@_type']) ? (r['@_type'] as RelationType) : undefined,
        associationClass: typeof r['@_associationClass'] === 'string' ? r['@_associationClass'] : undefined,
      });
    }
  }

  const classes: UmlClass[] = [];
  const classIds = new Set<string>();

  for (const el of packagedElements) {
    const xmiType = el['@_xmi:type'];
    if (
      xmiType !== 'uml:Class' &&
      xmiType !== 'uml:Enumeration' &&
      xmiType !== 'uml:Interface' &&
      xmiType !== 'uml:AssociationClass' // EA: a class and its association in one element
    )
      continue;
    const id = el['@_xmi:id'];
    if (!id || typeof id !== 'string') continue;
    classIds.add(id);

    const attributes: UmlAttribute[] = asArray<XmlNode>(el.ownedAttribute)
      // Skip attributes that are really association ends (EA marks them with @_association).
      .filter((attr) => !attr['@_association'])
      .map((attr) => ({
        name: attr['@_name'] ?? 'atributo',
        type: resolveAttrType(attr),
        visibility: toVisibility(attr['@_visibility']),
        isPrimaryKey: (attr['@_name'] ?? '').toLowerCase() === 'id' ? true : undefined,
        ...(attr['@_isStatic'] === 'true' ? { isStatic: true } : {}),
        ...(attr['@_isDerived'] === 'true' ? { isDerived: true } : {}),
        ...attributeMultiplicity(attr),
      }));

    for (const literal of asArray<XmlNode>(el.ownedLiteral)) {
      attributes.push({
        name: literal['@_name'] ?? 'VALOR',
        type: 'enum',
        visibility: 'public',
      });
    }

    const operations: UmlOperation[] = asArray<XmlNode>(el.ownedOperation).map((op) => {
      const params = asArray<XmlNode>(op.ownedParameter);
      const returnParam = params.find((p) => p['@_direction'] === 'return');
      const inParams = params
        .filter((p) => p['@_direction'] !== 'return' && typeof p['@_name'] === 'string')
        .map((p) => `${p['@_name']}: ${resolveAttrType(p)}`)
        .join(', ');
      return {
        name: op['@_name'] ?? 'operacion',
        returnType: returnParam ? resolveAttrType(returnParam) : 'void',
        visibility: toVisibility(op['@_visibility']),
        ...(inParams ? { parameters: inParams } : {}),
        ...(op['@_isStatic'] === 'true' ? { isStatic: true } : {}),
        ...(op['@_isAbstract'] === 'true' ? { isAbstract: true } : {}),
      };
    });

    const stereotype =
      xmiType === 'uml:Enumeration'
        ? 'enum'
        : xmiType === 'uml:Interface'
          ? 'interface'
          : el['@_isAbstract'] === 'true' || el['@_isAbstract'] === true
            ? 'abstract'
            : undefined;

    classes.push({
      id,
      name: el['@_name'] ?? 'ClaseSinNombre',
      attributes,
      operations: operations.length > 0 ? operations : undefined,
      stereotype,
    });
  }

  if (classes.length === 0) {
    throw new Error('No se encontraron clases en el archivo XMI.');
  }

  const relations: UmlRelation[] = [];
  let relCounter = 0;
  const nextRelId = () => `rel_${relCounter++}`;

  for (const el of packagedElements) {
    if (el['@_xmi:type'] !== 'uml:Class') continue;
    const sourceClassId = el['@_xmi:id'];
    for (const gen of asArray<XmlNode>(el.generalization)) {
      const targetClassId = gen['@_general'];
      if (!classIds.has(sourceClassId) || !classIds.has(targetClassId)) continue;
      relations.push({
        id: typeof gen['@_xmi:id'] === 'string' ? gen['@_xmi:id'] : nextRelId(),
        type: 'INHERITANCE',
        sourceClassId,
        targetClassId,
      });
    }
    // Class-owned <interfaceRealization> (UML 2.5 §10.4); the model keeps it as INHERITANCE
    // towards an «interface» class, which the canvas draws dashed and the generator as "implements".
    for (const real of asArray<XmlNode>(el.interfaceRealization)) {
      const targetClassId = real['@_contract'] ?? real['@_supplier'];
      if (!classIds.has(sourceClassId) || !classIds.has(targetClassId)) continue;
      relations.push({
        id: typeof real['@_xmi:id'] === 'string' ? real['@_xmi:id'] : nextRelId(),
        type: 'INHERITANCE',
        sourceClassId,
        targetClassId,
      });
    }
  }

  // Index association ends. EA may store one end as an association <ownedEnd> and the other as a
  // class-owned <ownedAttribute> (with @_association), both referenced from the association's <memberEnd>.
  const endNodeById = new Map<string, XmlNode>();
  const endClassById = new Map<string, string>();
  for (const el of packagedElements) {
    const t = el['@_xmi:type'];
    if (t === 'uml:Association' || t === 'uml:AssociationClass') {
      for (const oe of asArray<XmlNode>(el.ownedEnd)) {
        const pid = oe['@_xmi:id'];
        if (typeof pid !== 'string') continue;
        endNodeById.set(pid, oe);
        const cls = resolveEndType(oe); // an ownedEnd represents the class it is typed to
        if (cls) endClassById.set(pid, cls);
      }
    } else if (t === 'uml:Class') {
      const ownerId = el['@_xmi:id'];
      for (const oa of asArray<XmlNode>(el.ownedAttribute)) {
        const pid = oa['@_xmi:id'];
        if (typeof pid === 'string' && oa['@_association'] && typeof ownerId === 'string') {
          endNodeById.set(pid, oa); // an attribute-end represents its owner class
          endClassById.set(pid, ownerId);
        }
      }
    }
  }

  for (const el of packagedElements) {
    const isAssocClass = el['@_xmi:type'] === 'uml:AssociationClass';
    if (el['@_xmi:type'] !== 'uml:Association' && !isAssocClass) continue;
    const ownedEnds = asArray<XmlNode>(el.ownedEnd);

    let srcEnd: XmlNode;
    let tgtEnd: XmlNode;
    let sourceClassId: string | undefined;
    let targetClassId: string | undefined;

    if (ownedEnds.length >= 2 && resolveEndType(ownedEnds[0]) && resolveEndType(ownedEnds[1])) {
      // Our own format (and EA associations that carry both ends inline).
      srcEnd = ownedEnds[0];
      tgtEnd = ownedEnds[1];
      sourceClassId = resolveEndType(srcEnd);
      targetClassId = resolveEndType(tgtEnd);
    } else {
      // EA style: resolve both ends through the association's memberEnd references.
      const refs = asArray<XmlNode>(el.memberEnd)
        .map((m) => m['@_xmi:idref'])
        .filter((r): r is string => typeof r === 'string' && endClassById.has(r));
      if (refs.length < 2) continue;
      sourceClassId = endClassById.get(refs[0]);
      targetClassId = endClassById.get(refs[1]);
      srcEnd = endNodeById.get(refs[0]) ?? {};
      tgtEnd = endNodeById.get(refs[1]) ?? {};
    }

    if (
      !sourceClassId ||
      !targetClassId ||
      !classIds.has(sourceClassId) ||
      !classIds.has(targetClassId)
    )
      continue;

    const aggregation = srcEnd['@_aggregation'] ?? tgtEnd['@_aggregation'];
    const nameHint = typeof el['@_name'] === 'string' ? el['@_name'].toUpperCase() : '';
    const toolHint = toolRelations.get(el['@_xmi:id']);
    let type: RelationType;
    if (toolHint?.type) {
      type = toolHint.type;
    } else if ((RELATION_TYPES as string[]).includes(nameHint)) {
      type = nameHint as RelationType;
    } else if (aggregation === 'composite') {
      type = 'COMPOSITION';
    } else if (aggregation === 'shared') {
      type = 'AGGREGATION';
    } else {
      type = inferMultiplicity(srcEnd, tgtEnd);
    }

    // Multiplicities typed by the user: kept only where they differ from the type's default.
    const srcText = endText(srcEnd);
    const tgtText = endText(tgtEnd);
    const navigable = new Set(
      asArray<XmlNode>(el.navigableOwnedEnd).map((n) => n['@_xmi:idref']),
    );
    const srcNav = navigable.has(srcEnd['@_xmi:id']);
    const tgtNav = navigable.has(tgtEnd['@_xmi:id']);
    const elId = typeof el['@_xmi:id'] === 'string' ? el['@_xmi:id'] : undefined;
    const associationClassId = isAssocClass
      ? elId
      : toolHint?.associationClass && classIds.has(toolHint.associationClass)
        ? toolHint.associationClass
        : undefined;

    relations.push({
      // An EA association class shares its id with the class: give the relation its own.
      id: elId ? (isAssocClass ? `${elId}_assoc` : elId) : nextRelId(),
      type,
      sourceClassId,
      targetClassId,
      sourceRole: srcEnd['@_name'] || undefined,
      targetRole: tgtEnd['@_name'] || undefined,
      ...(srcText && srcText !== formatEnd(defaultSourceEnd(type)) ? { sourceMultiplicity: srcText } : {}),
      ...(tgtText && tgtText !== formatEnd(defaultTargetEnd(type)) ? { targetMultiplicity: tgtText } : {}),
      ...(tgtNav && !srcNav ? { navigability: 'SOURCE_TO_TARGET' as const } : {}),
      ...(srcNav && !tgtNav ? { navigability: 'TARGET_TO_SOURCE' as const } : {}),
      ...(associationClassId ? { associationClassId } : {}),
    });
  }

  for (const el of packagedElements) {
    const xmiType = el['@_xmi:type'];
    // Enterprise Architect writes an interface realization as a package-level uml:Realization.
    const isRealization = xmiType === 'uml:Realization' || xmiType === 'uml:InterfaceRealization';
    if (xmiType !== 'uml:Dependency' && !isRealization) continue;
    const sourceClassId = el['@_client'];
    const targetClassId = el['@_supplier'];
    if (!classIds.has(sourceClassId) || !classIds.has(targetClassId)) continue;
    relations.push({
      id: typeof el['@_xmi:id'] === 'string' ? el['@_xmi:id'] : nextRelId(),
      type: isRealization ? 'INHERITANCE' : 'DEPENDENCY',
      sourceClassId,
      targetClassId,
    });
  }

  return { name: diagramName, model: { classes, relations } };
}
