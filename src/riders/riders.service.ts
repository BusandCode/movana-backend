import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return rider;
  }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    return this.prisma.client.rider.update({
      where: { userId },
      data: { isAvailable: dto.isAvailable },
    });
  }

  async getEarnings(userId: string) {
    const earnings = await this.prisma.client.earningsEntry.findMany({
      where: { riderId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const total = earnings.reduce((sum, e) => sum + e.amount, 0);
    const today = earnings.filter(
      (e) => new Date(e.createdAt).toDateString() === new Date().toDateString(),
    );

    return {
      today: today.reduce((sum, e) => sum + e.amount, 0),
      total,
      currency: 'NGN',
      transactions: earnings,
    };
  }

  async getPerformance(userId: string) {
    const deliveries = await this.prisma.client.delivery.findMany({
      where: { riderId: userId },
    });

    const total = deliveries.length;
    const delivered = deliveries.filter((d) => d.status === 'DELIVERED').length;
    const cancelled = deliveries.filter((d) => d.status === 'CANCELLED').length;

    return {
      totalDeliveries: total,
      completedDeliveries: delivered,
      cancelledDeliveries: cancelled,
      successRate: total > 0 ? (delivered / total) * 100 : 0,
    };
  }
}
