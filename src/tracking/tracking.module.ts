import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service.js';
import { TrackingGateway } from './tracking.gateway.js';

@Module({
  providers: [TrackingService, TrackingGateway]
})
export class TrackingModule {}
