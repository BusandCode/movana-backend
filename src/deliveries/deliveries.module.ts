import { Module } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service.js';
import { DeliveriesController } from './deliveries.controller.js';

@Module({
  providers: [DeliveriesService],
  controllers: [DeliveriesController]
})
export class DeliveriesModule {}
