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
  /** Free-text parameter list, e.g. "id: Long, nombre: String" — not code-generated. */
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
  /** Free-text description of the class's purpose; shown in the inspector and the documentation report. */
  description?: string;
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
  DEPENDENCY: 'Dependencia',
};

/** Relation types rendered as a dashed line (standard UML notation for a Dependency). */
export const DASHED_RELATION_TYPES: ReadonlySet<RelationType> = new Set(['DEPENDENCY']);

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

/** Atomic edits the AI assistant can propose against the current diagram. */
export type DiagramOperation =
  | { op: 'CREATE_CLASS'; name: string; attributes?: UmlAttribute[] }
  | { op: 'DELETE_CLASS'; className: string }
  | { op: 'RENAME_CLASS'; className: string; newName: string }
  | { op: 'ADD_ATTRIBUTE'; className: string; attribute: UmlAttribute }
  | { op: 'REMOVE_ATTRIBUTE'; className: string; attributeName: string }
  | {
      op: 'CREATE_RELATION';
      sourceClassName: string;
      targetClassName: string;
      type: RelationType;
    }
  | { op: 'DELETE_RELATION'; sourceClassName: string; targetClassName: string }
  | { op: 'AUTO_LAYOUT' };

export interface EditDiagramResult {
  reply: string;
  operations: DiagramOperation[];
}
