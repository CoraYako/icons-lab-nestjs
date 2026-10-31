import { Module } from '@nestjs/common';
import { UserController } from './api/user.controller.js';
import { UserService } from './application/user.service.js';

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
