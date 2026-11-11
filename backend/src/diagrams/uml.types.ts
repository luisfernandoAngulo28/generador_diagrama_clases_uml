export type Visibility = 'public' | 'private' | 'protected' | 'package';

/** Where a model element came from: drawn by hand, applied by the AI, imported from XMI or a photo. */
export type AuthorSource = 'MANUAL' | 'AI' | 'XMI_IMPORT' | 'PHOTO';

/**
 * Granular authorship stamp (2do Parcial): who created/last touched a class,
 * attribute or relation, and when. Always computed server-side in
 * DiagramsService (the ValidationPipe whitelist strips it from client input),
 * so a client can't forge it. Optional everywhere: the generator, XMI export
 * and validation ignore it.
 */
export interface AuthorStamp {
  userId: string;
  userName: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  source?: AuthorSource;
}

export interface UmlAttribute {
  name: string;
  type: string;
  visibility: Visibility;
  isPrimaryKey?: boolean;
  /** UML 2.5: static (class-scoped) feature, drawn underlined. */
  isStatic?: boolean;
  /** UML 2.5: derived attribute, drawn with a leading "/". */
  isDerived?: boolean;
  /** UML 2.5 attribute multiplicity, e.g. "0..*" → "telefonos : String [0..*]". */
  multiplicity?: string;
  author?: AuthorStamp;
  lastModifiedBy?: AuthorStamp;
}

export interface UmlOperation {
  name: string;
  returnType: string;
  visibility: Visibility;
  /** Free-text parameter list, e.g. "id: Long, nombre: String" — kept simple, not code-generated. */
  parameters?: string;
  /** UML 2.5: static operation, drawn underlined. */
  isStatic?: boolean;
  /** UML 2.5: abstract operation, drawn in italics. */
  isAbstract?: boolean;
}

export type ClassStereotype = 'enum' | 'abstract' | 'interface';

export interface UmlClass {
  id: string;
  name: string;
  attributes: UmlAttribute[];
  /** Operations (methods) shown in the UML notation and exported to XMI; not used by the code generator. */
  operations?: UmlOperation[];
  /**
   * «enum»: generates a plain Java enum (attribute names become literals) instead of a JPA entity.
   * «abstract»: generates an `abstract class`; only meaningful together with an INHERITANCE relation.
   * «interface»: generates a plain Java interface from `operations` (no JPA entity, no attributes).
   */
  stereotype?: ClassStereotype;
  /** Free-text description of the class's purpose; shown in the inspector and the documentation report. */
  description?: string;
  /** Canvas position; not used by the generator, kept only for the frontend layout. */
  position?: { x: number; y: number };
  author?: AuthorStamp;
  lastModifiedBy?: AuthorStamp;
}

export type Navigability = 'SOURCE_TO_TARGET' | 'TARGET_TO_SOURCE';

export type RelationType =
  | 'ASSOCIATION'
  | 'AGGREGATION'
  | 'COMPOSITION'
  | 'INHERITANCE'
  | 'ONE_TO_ONE'
  | 'ONE_TO_MANY'
  | 'MANY_TO_ONE'
  | 'MANY_TO_MANY'
  /** UML "uses" relation: A depends on B without owning/persisting a reference to it. No JPA field is generated. */
  | 'DEPENDENCY';

export interface UmlRelation {
  id: string;
  type: RelationType;
  sourceClassId: string;
  targetClassId: string;
  sourceRole?: string;
  targetRole?: string;
  /**
   * UML 2.5 multiplicities typed by the user ("1", "0..1", "2..5", "1..*"). When absent, the
   * multiplicity follows the relation type (ONE_TO_MANY → 1 / 0..*), as before.
   */
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  /** UML 2.5 navigability: an open arrowhead on the navigable end. Absent = unspecified. */
  navigability?: Navigability;
  /** UML 2.5 association class: a class attached with a dashed line to this association. */
  associationClassId?: string;
  author?: AuthorStamp;
  lastModifiedBy?: AuthorStamp;
}

export interface UmlNote {
  id: string;
  text: string;
  title?: string;
  position?: { x: number; y: number };
}

export interface UmlModel {
  classes: UmlClass[];
  relations: UmlRelation[];
  notes?: UmlNote[];
}
