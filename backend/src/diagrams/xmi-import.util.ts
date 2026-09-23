import { XMLParser } from 'fast-xml-parser';
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
  if (srcMany && !tgtMany) return 'MANY_TO_ONE';
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

  const diagramName: string =
    typeof umlModel['@_name'] === 'string' ? umlModel['@_name'] : 'Diagrama importado';
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

  const classes: UmlClass[] = [];
  const classIds = new Set<string>();

  for (const el of packagedElements) {
    const xmiType = el['@_xmi:type'];
    if (xmiType !== 'uml:Class' && xmiType !== 'uml:Enumeration' && xmiType !== 'uml:Interface')
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
      }));

    for (const literal of asArray<XmlNode>(el.ownedLiteral)) {
      attributes.push({
        name: literal['@_name'] ?? 'VALOR',
        type: 'enum',
        visibility: 'public',
      });
    }

    const operations: UmlOperation[] = asArray<XmlNode>(el.ownedOperation).map((op) => {
      const returnParam = asArray<XmlNode>(op.ownedParameter).find(
        (p) => p['@_direction'] === 'return',
      );
      return {
        name: op['@_name'] ?? 'operacion',
        returnType: returnParam ? resolveType(returnParam['@_type']) : 'void',
        visibility: toVisibility(op['@_visibility']),
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
  }

  // Index association ends. EA may store one end as an association <ownedEnd> and the other as a
  // class-owned <ownedAttribute> (with @_association), both referenced from the association's <memberEnd>.
  const endNodeById = new Map<string, XmlNode>();
  const endClassById = new Map<string, string>();
  for (const el of packagedElements) {
    const t = el['@_xmi:type'];
    if (t === 'uml:Association') {
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
    if (el['@_xmi:type'] !== 'uml:Association') continue;
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
    let type: RelationType;
    if ((RELATION_TYPES as string[]).includes(nameHint)) {
      type = nameHint as RelationType;
    } else if (aggregation === 'composite') {
      type = 'COMPOSITION';
    } else if (aggregation === 'shared') {
      type = 'AGGREGATION';
    } else {
      type = inferMultiplicity(srcEnd, tgtEnd);
    }

    relations.push({
      id: typeof el['@_xmi:id'] === 'string' ? el['@_xmi:id'] : nextRelId(),
      type,
      sourceClassId,
      targetClassId,
      sourceRole: srcEnd['@_name'] || undefined,
      targetRole: tgtEnd['@_name'] || undefined,
    });
  }

  for (const el of packagedElements) {
    if (el['@_xmi:type'] !== 'uml:Dependency') continue;
    const sourceClassId = el['@_client'];
    const targetClassId = el['@_supplier'];
    if (!classIds.has(sourceClassId) || !classIds.has(targetClassId)) continue;
    relations.push({
      id: typeof el['@_xmi:id'] === 'string' ? el['@_xmi:id'] : nextRelId(),
      type: 'DEPENDENCY',
      sourceClassId,
      targetClassId,
    });
  }

  return { name: diagramName, model: { classes, relations } };
}
