import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDbOptions } from './typeorm.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      // ConfigModule no se usa dentro de useFactory, pero garantiza que
      // el archivo .env se ha cargado en process.env antes de construir la conexión
      inject: [ConfigService],
      useFactory: () => ({
        ...buildDbOptions(process.env),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
