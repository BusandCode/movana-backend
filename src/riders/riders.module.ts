import { Module } from '@nestjs/common';
import { RidersService } from './riders.service.js';
import { RidersController } from './riders.controller.js';

@Module({
  providers: [RidersService],
  controllers: [RidersController]
})
export class RidersModule {}
