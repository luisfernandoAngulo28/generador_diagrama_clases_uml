export type Visibility = 'public' | 'private' | 'protected' | 'package';

export interface UmlAttribute {
  name: string;
  type: string;
  visibility: Visibility;
  isPrimaryKey?: boolean;
}

export interface UmlClass {
  id: string;
  name: string;
  attributes: UmlAttribute[];
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
