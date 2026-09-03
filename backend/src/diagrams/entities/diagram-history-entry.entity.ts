import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Audit trail ("bitácora") of who changed a diagram and when. Deliberately
 * not a foreign key to Diagram — an entry survives even if the diagram is
 * later deleted, and the diagram's own deletion doesn't need cascade logic.
 */
@Entity('diagram_history_entries')
export class DiagramHistoryEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  diagramId: string;

  @Column()
  userId: string;

  @Column()
  userName: string;

  /** Human-readable summary of what changed, e.g. "Agregó la clase Pedido; eliminó 1 relación". */
  @Column()
  summary: string;

  @CreateDateColumn()
  createdAt: Date;
}
