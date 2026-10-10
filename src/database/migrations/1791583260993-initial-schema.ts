import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Esquema inicial de icons-lab.
 *
 * Convenciones:
 *   - Nombres en snake_case y plural (tablas).
 *   - PK uuid generadas por la base con gen_random_uuid().
 *   - Fechas de auditoría en timestamptz (con zona horaria).
 *   - Borrado lógico mediante deleted_at (NULL = activo).
 *   - Las imágenes NO se guardan como URL: se guarda la clave del objeto en el
 *     bucket (p. ej. 'continents/0b6f…/cover.webp'). La API resuelve esa clave
 *     a una URL (firmada o pública) solo cuando el cliente pide la imagen.
 *
 * Sin BEGIN/COMMIT: TypeORM ya ejecuta cada migración dentro de su propia
 * transacción.
 */
export class InitialSchema1791583260993 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- ---------------------------------------------------------------------
      -- Tipos
      -- ---------------------------------------------------------------------
      CREATE TYPE user_role AS ENUM ('ADMIN', 'VIEWER');


      -- ---------------------------------------------------------------------
      -- users
      -- ---------------------------------------------------------------------
      CREATE TABLE users (
        id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name    varchar(80)  NOT NULL,
        last_name     varchar(80)  NOT NULL,
        email         varchar(254) NOT NULL,
        password_hash varchar(255) NOT NULL,
        role          user_role    NOT NULL DEFAULT 'VIEWER',
        enabled       boolean      NOT NULL DEFAULT true,
        created_at    timestamptz  NOT NULL DEFAULT now(),
        updated_at    timestamptz  NOT NULL DEFAULT now(),

        -- El email se guarda normalizado en minúsculas; así UNIQUE basta para
        -- impedir duplicados como 'Ana@Mail.com' / 'ana@mail.com'.
        CONSTRAINT uq_users_email       UNIQUE (email),
        CONSTRAINT ck_users_email_lower CHECK (email = lower(email))
      );


      -- ---------------------------------------------------------------------
      -- continents
      -- ---------------------------------------------------------------------
      CREATE TABLE continents (
        id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        name       varchar(60) NOT NULL,
        image_key  varchar(512),                  -- clave del objeto en el bucket
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),

        CONSTRAINT uq_continents_name UNIQUE (name)
      );


      -- ---------------------------------------------------------------------
      -- countries
      -- ---------------------------------------------------------------------
      CREATE TABLE countries (
        id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
        continent_id uuid             NOT NULL,
        name         varchar(100)     NOT NULL,
        image_key    varchar(512),                -- clave del objeto en el bucket
        population   bigint           NOT NULL,
        area_km2     double precision NOT NULL,
        created_at   timestamptz      NOT NULL DEFAULT now(),
        updated_at   timestamptz      NOT NULL DEFAULT now(),
        deleted_at   timestamptz,

        CONSTRAINT fk_countries_continent
          FOREIGN KEY (continent_id) REFERENCES continents (id)
          ON DELETE RESTRICT,                     -- no se borra un continente con países
        CONSTRAINT ck_countries_population CHECK (population >= 0),
        CONSTRAINT ck_countries_area       CHECK (area_km2 > 0)
      );

      -- PostgreSQL NO indexa automáticamente las FK. Se filtra países por
      -- continente y se hace JOIN continents ↔ countries.
      CREATE INDEX ix_countries_continent_id ON countries (continent_id);

      -- Nombre único solo entre países activos: permite recrear un país que
      -- fue borrado lógicamente sin chocar con la fila "eliminada".
      CREATE UNIQUE INDEX uq_countries_name_active
        ON countries (name)
        WHERE deleted_at IS NULL;


      -- ---------------------------------------------------------------------
      -- icons  (íconos/monumentos de cada país)
      -- ---------------------------------------------------------------------
      CREATE TABLE icons (
        id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        name                varchar(120) NOT NULL,
        image_key           varchar(512),         -- clave del objeto en el bucket
        creation_date       date,                 -- fecha de creación del monumento
        height_m            integer      NOT NULL,
        history_description text,
        created_at          timestamptz  NOT NULL DEFAULT now(),
        updated_at          timestamptz  NOT NULL DEFAULT now(),
        deleted_at          timestamptz,

        CONSTRAINT ck_icons_height CHECK (height_m >= 1)
      );


      -- ---------------------------------------------------------------------
      -- icons_countries  (N:M — un ícono puede pertenecer a varios países,
      --                    p. ej. Cataratas del Iguazú: Argentina y Brasil)
      -- ---------------------------------------------------------------------
      CREATE TABLE icons_countries (
        icon_id    uuid NOT NULL,
        country_id uuid NOT NULL,

        -- La PK compuesta evita duplicados y ya indexa las búsquedas por icon_id.
        CONSTRAINT pk_icons_countries PRIMARY KEY (icon_id, country_id),
        CONSTRAINT fk_icons_countries_icon
          FOREIGN KEY (icon_id)    REFERENCES icons (id)     ON DELETE CASCADE,
        CONSTRAINT fk_icons_countries_country
          FOREIGN KEY (country_id) REFERENCES countries (id) ON DELETE CASCADE
      );

      -- La PK (icon_id, country_id) no sirve para buscar solo por country_id:
      -- "íconos de un país" y "países que tienen el ícono X".
      CREATE INDEX ix_icons_countries_country_id ON icons_countries (country_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Orden inverso a up(): primero las tablas que dependen de otras.
    // Los índices y constraints se eliminan junto con su tabla.
    await queryRunner.query(`
      DROP TABLE icons_countries;
      DROP TABLE icons;
      DROP TABLE countries;
      DROP TABLE continents;
      DROP TABLE users;
      DROP TYPE user_role;
    `);
  }
}
