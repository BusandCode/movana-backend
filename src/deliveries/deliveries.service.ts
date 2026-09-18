import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  private transformDelivery(d: any) {
    return {
      id: d.id,
      trackingId: d.trackingId,
      status: d.status,
      deliveryType: d.deliveryType,
      priority: d.priority,
      pickup: {
        name: d.pickupName,
        phone: d.pickupPhone,
        address: d.pickupAddress,
        coordinates: {
          latitude: d.pickupLatitude,
          longitude: d.pickupLongitude,
        },
      },
      dropoff: {
        name: d.dropoffName,
        phone: d.dropoffPhone,
        address: d.dropoffAddress,
        coordinates: {
          latitude: d.dropoffLatitude,
          longitude: d.dropoffLongitude,
        },
      },
      package: {
        description: d.packageDescription,
        quantity: d.packageQuantity,
        weightKg: d.packageWeightKg,
      },
      fee: d.fee,
      riderEarnings: d.riderEarnings,
      distanceKm: d.distanceKm,
      etaWindow:
        d.etaWindowStart && d.etaWindowEnd
          ? { start: d.etaWindowStart, end: d.etaWindowEnd }
          : undefined,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  async getAvailableOffers(riderId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    // Exclude deliveries this rider has already rejected, so they don't
    // keep reappearing in the offers feed after being turned down.
    const rejections = await this.prisma.client.deliveryRejection.findMany({
      where: { riderId: rider.id },
      select: { deliveryId: true },
    });
    const rejectedIds = rejections.map((r) => r.deliveryId);

    const deliveries = await this.prisma.client.delivery.findMany({
      where: {
        status: { in: ['CREATED', 'PENDING'] },
        riderId: null,
        id: { notIn: rejectedIds.length ? rejectedIds : undefined },
      },
      take: 20,
    });

    return deliveries.map((d) => ({
      ...this.transformDelivery(d),
      aiScore: Math.round(Math.random() * 100),
      aiReason: 'Nearby delivery',
    }));
  }

  async getActiveDeliveries(riderId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const deliveries = await this.prisma.client.delivery.findMany({
      where: {
        riderId: rider.id,
        status: {
          notIn: ['DELIVERED', 'CANCELLED', 'FAILED'],
        },
      },
    });

    return deliveries.map((d) => this.transformDelivery(d));
  }

  async getDeliveryHistory(riderId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const deliveries = await this.prisma.client.delivery.findMany({
      where: {
        riderId: rider.id,
        status: { in: ['DELIVERED', 'CANCELLED', 'FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return deliveries.map((d) => this.transformDelivery(d));
  }

  async getDelivery(id: string) {
    const delivery = await this.prisma.client.delivery.findUnique({
      where: { id },
      include: {
        statusHistory: true,
        proofOfDelivery: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    return {
      ...this.transformDelivery(delivery),
      statusHistory: delivery.statusHistory,
      proofOfDelivery: delivery.proofOfDelivery,
    };
  }

  async acceptDelivery(deliveryId: string, userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const delivery = await this.prisma.client.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.riderId) {
      throw new BadRequestException('Delivery already assigned');
    }

    const updated = await this.prisma.client.delivery.update({
      where: { id: deliveryId },
      data: {
        riderId: rider.id,
        status: 'RIDER_ASSIGNED',
        statusHistory: {
          create: {
            status: 'RIDER_ASSIGNED',
          },
        },
      },
    });

    return this.transformDelivery(updated);
  }

  // logs rejection in DeliveryRejection table
  async rejectDelivery(deliveryId: string, userId: string, reason?: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const delivery = await this.prisma.client.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    await this.prisma.client.deliveryRejection.create({
      data: {
        deliveryId,
        riderId: rider.id,
        reason: reason || null,
      },
    });

    console.log(`❌ Rider ${rider.name} rejected delivery ${delivery.trackingId}`);

    return {
      success: true,
      message: 'Delivery rejected',
      deliveryId: delivery.id,
    };
  }

  // Sets timestamps + creates earnings + updates rider stats
  async updateStatus(deliveryId: string, status: string) {
    const delivery = await this.prisma.client.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const timestampData: any = {};
    const now = new Date();

    if (status === 'ACCEPTED') timestampData.acceptedAt = now;
    if (status === 'PICKED_UP') timestampData.pickedUpAt = now;
    if (status === 'DELIVERED') timestampData.deliveredAt = now;
    if (status === 'CANCELLED') timestampData.cancelledAt = now;

    const updated = await this.prisma.client.delivery.update({
      where: { id: deliveryId },
      data: {
        status: status as any,
        ...timestampData,
        statusHistory: {
          create: {
            status: status as any,
          },
        },
      },
    });
    if (status === 'DELIVERED' && delivery.riderId) {
      if (delivery.riderEarnings > 0) {
        const existingEarning = await this.prisma.client.earningsEntry.findFirst({
          where: { deliveryId: delivery.id },
        });

        if (!existingEarning) {
          await this.prisma.client.earningsEntry.create({
            data: {
              riderId: delivery.riderId,
              deliveryId: delivery.id,
              amount: delivery.riderEarnings,
              note: `Delivery ${delivery.trackingId}`,
            },
          });
        }
      }

      await this.recalculateRiderStats(delivery.riderId);
    }
    if ((status === 'CANCELLED' || status === 'FAILED') && delivery.riderId) {
      await this.recalculateRiderStats(delivery.riderId);
    }

    return this.transformDelivery(updated);
  }

  async submitProofOfDelivery(deliveryId: string, userId: string, proof: any) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const delivery = await this.prisma.client.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const methodMap: Record<string, any> = {
      otp: 'OTP',
      photo: 'PHOTO',
      signature: 'SIGNATURE',
    };

    const prismaMethod = methodMap[(proof.method || '').toLowerCase()] || 'OTP';

    const existing = await this.prisma.client.proofOfDelivery.findUnique({
      where: { deliveryId },
    });

    let proofRecord;

    if (existing) {
      proofRecord = await this.prisma.client.proofOfDelivery.update({
        where: { deliveryId },
        data: {
          method: prismaMethod,
          otpCode: proof.otpCode || null,
          photoUrl: proof.photoUri || null,
          recipientName: proof.recipientName || null,
          latitude: proof.coordinates?.latitude ?? null,
          longitude: proof.coordinates?.longitude ?? null,
        },
      });
    } else {
      proofRecord = await this.prisma.client.proofOfDelivery.create({
        data: {
          deliveryId,
          method: prismaMethod,
          otpCode: proof.otpCode || null,
          photoUrl: proof.photoUri || null,
          recipientName: proof.recipientName || null,
          latitude: proof.coordinates?.latitude ?? null,
          longitude: proof.coordinates?.longitude ?? null,
        },
      });
    }

    if (delivery.riderId && delivery.riderEarnings > 0) {
      const existingEarning = await this.prisma.client.earningsEntry.findFirst({
        where: { deliveryId: delivery.id },
      });

      if (!existingEarning) {
        await this.prisma.client.earningsEntry.create({
          data: {
            riderId: delivery.riderId,
            deliveryId: delivery.id,
            amount: delivery.riderEarnings,
            note: `Delivery ${delivery.trackingId}`,
          },
        });
      }
    }

    if (delivery.riderId) {
      await this.recalculateRiderStats(delivery.riderId);
    }

    return proofRecord;
  }
  private async recalculateRiderStats(riderId: string) {
    const [delivered, cancelled, failed] = await Promise.all([
      this.prisma.client.delivery.count({ where: { riderId, status: 'DELIVERED' } }),
      this.prisma.client.delivery.count({ where: { riderId, status: 'CANCELLED' } }),
      this.prisma.client.delivery.count({ where: { riderId, status: 'FAILED' } }),
    ]);

    const finished = delivered + cancelled + failed;
    const successRate = finished > 0 ? Math.round((delivered / finished) * 100) : 0;

    await this.prisma.client.rider.update({
      where: { id: riderId },
      data: {
        totalDeliveriesCompleted: delivered,
        successRate,
      },
    });

    console.log(
      `Rider stats updated: ${delivered}/${finished} finished (${successRate}%)`
    );
  }
}