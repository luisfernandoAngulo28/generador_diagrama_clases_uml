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
  const packagedElements = asArray<XmlNode>(umlModel.packagedElement);

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

  const classes: UmlClass[] = [];
  const classIds = new Set<string>();

  for (const el of packagedElements) {
    const xmiType = el['@_xmi:type'];
    if (xmiType !== 'uml:Class' && xmiType !== 'uml:Enumeration') continue;
    const id = el['@_xmi:id'];
    if (!id || typeof id !== 'string') continue;
    classIds.add(id);

    const attributes: UmlAttribute[] = asArray<XmlNode>(el.ownedAttribute).map((attr) => ({
      name: attr['@_name'] ?? 'atributo',
      type: resolveType(attr['@_type']),
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

    classes.push({
      id,
      name: el['@_name'] ?? 'ClaseSinNombre',
      attributes,
      operations: operations.length > 0 ? operations : undefined,
      stereotype: xmiType === 'uml:Enumeration' ? 'enum' : undefined,
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

  for (const el of packagedElements) {
    if (el['@_xmi:type'] !== 'uml:Association') continue;
    const ends = asArray<XmlNode>(el.ownedEnd);
    if (ends.length < 2) continue;
    const [srcEnd, tgtEnd] = ends;
    const sourceClassId = srcEnd['@_type'];
    const targetClassId = tgtEnd['@_type'];
    if (!classIds.has(sourceClassId) || !classIds.has(targetClassId)) continue;

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
