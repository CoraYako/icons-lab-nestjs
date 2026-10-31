import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Country } from '../../country/model/country.entity.js';

@Entity('icons')
@Check('ck_icons_height', `"height_m" >= 1`)
export class Icon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'image_key', type: 'varchar', length: 512, nullable: true })
  imageKey!: string | null;

  @Column({ name: 'creation_date', type: 'date', nullable: true })
  creationDate!: string | null;

  @Column({ name: 'height_m', type: 'integer' })
  heightM!: number;

  @Column({ name: 'history_description', type: 'text', nullable: true })
  historyDescription!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;

  @ManyToMany(() => Country, (country) => country.icons)
  @JoinTable({
    name: 'icons_countries',
    joinColumn: { name: 'icon_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'country_id', referencedColumnName: 'id' },
    synchronize: false, // la estructura la define la migración, no TypeORM
  })
  countries!: Relation<Country[]>;
}
