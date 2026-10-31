import {
  Check,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Continent } from '../../continent/model/continent.entity.js';
import { bigintToNumber } from '../../../common/bigint-to-number.transformer.js';
import { Icon } from '../../icon/model/icon.entity.js';

@Entity('countries')
@Check('ck_countries_population', `"population" >= 0`)
@Check('ck_countries_area', `"area_km2" > 0`)
@Index('ix_countries_continent_id', ['continent'])
@Index('uq_countries_name_active', ['name'], {
  unique: true,
  where: `"deleted_at" IS NULL`,
})
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Continent, (continent) => continent.countries, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'continent_id',
    foreignKeyConstraintName: 'fk_countries_continent',
  })
  continent!: Relation<Continent>;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'image_key', type: 'varchar', length: 512, nullable: true })
  imageKey!: string | null;

  @Column({ type: 'bigint', transformer: bigintToNumber })
  population!: number;

  @Column({ name: 'area_km2', type: 'double precision' })
  areaKm2!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;

  @ManyToMany(() => Icon, (icon) => icon.countries)
  icons!: Relation<Icon[]>;
}
