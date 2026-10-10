import { Module } from '@nestjs/common';
import { DatabaseModule } from './config/database.module.js';

@Module({
  imports: [DatabaseModule,],
})
export class AppModule {}
