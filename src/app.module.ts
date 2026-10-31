import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './config/database.module.js';
import { ContinentModule } from './modules/continent/continent.module.js';
import { StorageModule } from './storage/storage.module.js';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory.js';
import { ProblemDetailsFilter } from './common/exceptions/problem-details.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ContinentModule,
    StorageModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
