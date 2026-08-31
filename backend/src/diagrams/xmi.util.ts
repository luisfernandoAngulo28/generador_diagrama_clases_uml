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
    case 'COMPOSITION':
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
      return { lower: '1', upper: '1' };
    case 'MANY_TO_ONE':
    case 'COMPOSITION':
    case 'AGGREGATION':
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

export function renderXmi(diagramName: string, model: UmlModel): string {
  const nonInheritance = model.relations.filter((r) => r.type !== 'INHERITANCE');
  const inheritance = model.relations.filter((r) => r.type === 'INHERITANCE');

  const distinctTypes = new Set<string>();
  for (const cls of model.classes) {
    for (const attr of cls.attributes) distinctTypes.add(attr.type);
  }

  const typeDeclarations = [...distinctTypes]
    .map(
      (t) =>
        `    <packagedElement xmi:type="uml:PrimitiveType" xmi:id="type_${sanitizeId(t)}" name="${escapeXml(t)}"/>`,
    )
    .join('\n');

  const classElements = model.classes
    .map((cls) => {
      const classId = sanitizeId(cls.id);
      const generalizations = inheritance
        .filter((r) => r.sourceClassId === cls.id)
        .map(
          (r) =>
            `      <generalization xmi:id="gen_${sanitizeId(r.id)}" xmi:type="uml:Generalization" general="${sanitizeId(r.targetClassId)}"/>`,
        )
        .join('\n');

      const attributes = cls.attributes
        .map(
          (attr) => `      <ownedAttribute xmi:id="${classId}_${escapeXml(attr.name)}" name="${escapeXml(attr.name)}" visibility="${attr.visibility}">
        <type xmi:idref="type_${sanitizeId(attr.type)}"/>
      </ownedAttribute>`,
        )
        .join('\n');

      return `    <packagedElement xmi:type="uml:Class" xmi:id="${classId}" name="${escapeXml(cls.name)}">
${attributes}${attributes ? '\n' : ''}${generalizations}
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
      const sourceEndAttrs = aggregation ? ` aggregation="${aggregation}"` : '';

      return `    <packagedElement xmi:type="uml:Association" xmi:id="${relId}" name="${rel.type.toLowerCase()}">
      <memberEnd xmi:idref="${relId}_src"/>
      <memberEnd xmi:idref="${relId}_tgt"/>
      <ownedEnd xmi:id="${relId}_src" type="${sourceId}"${sourceEndAttrs}>
        <lowerValue xmi:type="uml:LiteralInteger" value="${srcMult.lower}"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${srcMult.upper}"/>
      </ownedEnd>
      <ownedEnd xmi:id="${relId}_tgt" type="${targetId}">
        <lowerValue xmi:type="uml:LiteralInteger" value="${tgtMult.lower}"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="${tgtMult.upper}"/>
      </ownedEnd>
    </packagedElement>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" xmi:id="model_1" name="${escapeXml(diagramName)}">
${typeDeclarations}
${classElements}
${associationElements}
  </uml:Model>
</xmi:XMI>
`;
}
