export type Visibility = 'public' | 'private' | 'protected' | 'package';

export interface UmlAttribute {
  name: string;
  type: string;
  visibility: Visibility;
  isPrimaryKey?: boolean;
}

export interface UmlOperation {
  name: string;
  returnType: string;
  visibility: Visibility;
  /** Free-text parameter list, e.g. "id: Long, nombre: String" — kept simple, not code-generated. */
  parameters?: string;
}

export type ClassStereotype = 'enum';

export interface UmlClass {
  id: string;
  name: string;
  attributes: UmlAttribute[];
  /** Operations (methods) shown in the UML notation and exported to XMI; not used by the code generator. */
  operations?: UmlOperation[];
  /** «enum»: generates a plain Java enum (attribute names become literals) instead of a JPA entity. */
  stereotype?: ClassStereotype;
  /** Canvas position; not used by the generator, kept only for the frontend layout. */
  position?: { x: number; y: number };
}

export type RelationType =
  | 'ASSOCIATION'
  | 'AGGREGATION'
  | 'COMPOSITION'
  | 'INHERITANCE'
  | 'ONE_TO_ONE'
  | 'ONE_TO_MANY'
  | 'MANY_TO_ONE'
  | 'MANY_TO_MANY';

export interface UmlRelation {
  id: string;
  type: RelationType;
  sourceClassId: string;
  targetClassId: string;
  sourceRole?: string;
  targetRole?: string;
}

export interface UmlModel {
  classes: UmlClass[];
  relations: UmlRelation[];
}
