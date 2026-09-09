import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
  providers: [NotificationsService],
  controllers: [NotificationsController]
})
export class NotificationsModule {}
