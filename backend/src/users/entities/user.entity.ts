import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Index({ unique: true })
  @Column()
  email: string;

  /** bcrypt hash; never sent to the client. */
  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
