import { Module } from '@nestjs/common';
import { ContinentController } from './api/continent.controller.js';
import { ContinentService } from './application/continent.service.js';

@Module({
  controllers: [ContinentController],
  providers: [ContinentService],
})
export class ContinentModule {}
