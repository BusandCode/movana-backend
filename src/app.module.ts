import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RidersModule } from './riders/riders.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { TrackingModule } from './tracking/tracking.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { AiModule } from './ai/ai.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RidersModule,
    DeliveriesModule,
    TrackingModule,
    PaymentsModule,
    NotificationsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
