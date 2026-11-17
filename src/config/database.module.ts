import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDbOptions } from './typeorm.config.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      /// ConfigService no se usa dentro de useFactory, pero inyectarlo obliga a Nest
      // a inicializar ConfigModule (y cargar el .env) antes de construir la conexión
      inject: [ConfigService],
      useFactory: () => ({
        ...buildDbOptions(process.env),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
