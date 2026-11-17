import { Module } from '@nestjs/common';
import { ContinentController } from './api/continent.controller.js';
import { ContinentService } from './application/continent.service.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Continent } from './model/continent.entity.js';
import { StorageModule } from '../../storage/storage.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Continent]), StorageModule],
  controllers: [ContinentController],
  providers: [ContinentService],
})
export class ContinentModule {}
