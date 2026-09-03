export type Visibility = 'public' | 'private' | 'protected' | 'package';

export interface UmlAttribute {
  name: string;
  type: string;
  visibility: Visibility;
  isPrimaryKey?: boolean;
}

export type ClassStereotype = 'enum';

export interface UmlClass {
  id: string;
  name: string;
  attributes: UmlAttribute[];
  /** «enum»: generates a plain Java enum (attribute names become literals) instead of a JPA entity. */
  stereotype?: ClassStereotype;
  /** Canvas position, persisted so a reloaded/shared diagram keeps its layout. */
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

export interface Diagram {
  id: string;
  name: string;
  model: UmlModel;
  createdAt: string;
  updatedAt: string;
}

export const RELATION_LABELS: Record<RelationType, string> = {
  ASSOCIATION: 'Asociación',
  AGGREGATION: 'Agregación',
  COMPOSITION: 'Composición',
  INHERITANCE: 'Herencia',
  ONE_TO_ONE: '1 : 1',
  ONE_TO_MANY: '1 : N',
  MANY_TO_ONE: 'N : 1',
  MANY_TO_MANY: 'N : M',
};

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  classId?: string;
  className?: string;
  relationId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export const VISIBILITY_SYMBOLS: Record<Visibility, string> = {
  public: '+',
  private: '-',
  protected: '#',
  package: '~',
};
