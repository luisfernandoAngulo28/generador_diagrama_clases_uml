/** Same values as the authorship `source` of the model. */
type AuthorSource = 'MANUAL' | 'AI' | 'XMI_IMPORT' | 'PHOTO';

/** One entry of a diagram's version history (GET /diagrams/:id/versions). */
export interface DiagramVersion {
  id: string;
  number: number;
  name: string;
  author: { userId: string; userName: string };
  source: AuthorSource;
  changesCount: number;
  summary: string;
  /** Set when the version was created by restoring an earlier one. */
  restoredFrom?: number;
  classCount: number;
  relationCount: number;
  createdAt: string;
  updatedAt: string;
}
