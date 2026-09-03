import type { RelationType, UmlAttribute } from '../diagrams/uml.types.js';

/**
 * Atomic edits the AI assistant can propose against the CURRENT diagram,
 * instead of regenerating the whole model from scratch on every message.
 */
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
