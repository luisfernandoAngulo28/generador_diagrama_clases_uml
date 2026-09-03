import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Metadata for a file uploaded to S3 and attached to a diagram (documents,
 * images, etc.). The actual file bytes live in S3 under `s3Key` — this row
 * is just the pointer + audit info, matching the diagram history entry
 * pattern (no FK to Diagram, so an entry survives even if the diagram is
 * later deleted; deletion is a deliberate two-step: S3 object + this row).
 */
@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  diagramId: string;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column()
  sizeBytes: number;

  @Column()
  s3Key: string;

  @Column()
  uploadedByUserId: string;

  @Column()
  uploadedByUserName: string;

  @CreateDateColumn()
  createdAt: Date;
}
