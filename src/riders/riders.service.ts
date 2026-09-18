import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService) {}

  // ==============================
  // PROFILE
  // ==============================

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

  // ==============================
  // AVAILABILITY
  // ==============================

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    return this.prisma.client.rider.update({
      where: { userId },
      data: { isAvailable: dto.isAvailable },
    });
  }

  // ==============================
  // EARNINGS
  // ==============================

  async getEarnings(userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const earnings = await this.prisma.client.earningsEntry.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
    });

    const total = earnings.reduce((sum, e) => sum + e.amount, 0);

    const today = earnings.filter(
      (e) => new Date(e.createdAt).toDateString() === new Date().toDateString(),
    );
    const todayTotal = today.reduce((sum, e) => sum + e.amount, 0);

    const thisWeek = earnings.filter((e) => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      return new Date(e.createdAt) >= startOfWeek;
    });
    const thisWeekTotal = thisWeek.reduce((sum, e) => sum + e.amount, 0);

    const thisMonth = earnings.filter((e) => {
      const now = new Date();
      return (
        new Date(e.createdAt).getMonth() === now.getMonth() &&
        new Date(e.createdAt).getFullYear() === now.getFullYear()
      );
    });
    const thisMonthTotal = thisMonth.reduce((sum, e) => sum + e.amount, 0);

    return {
      today: todayTotal,
      thisWeek: thisWeekTotal,
      thisMonth: thisMonthTotal,
      lifetime: total,
      currency: 'NGN',
      transactions: earnings.slice(0, 20),
    };
  }

  // ==============================
  // PERFORMANCE
  // ==============================

  async getPerformance(userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
      include: {
        deliveries: true,
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const deliveries = rider.deliveries || [];

    const delivered = deliveries.filter((d) => d.status === 'DELIVERED');
    const cancelled = deliveries.filter((d) => d.status === 'CANCELLED').length;

    // ✅ Real on-time vs late check
    let onTime = 0;
    let late = 0;

    for (const d of delivered) {
      if (!d.deliveredAt || !d.etaWindowEnd) {
        // No timestamp or no ETA window — count as on-time by default
        onTime++;
        continue;
      }

      // Parse ETA window end (e.g., "2:55 PM")
      const parts = d.etaWindowEnd.split(' ');
      if (parts.length !== 2) {
        onTime++;
        continue;
      }

      const [time, meridiem] = parts;
      const timeParts = time.split(':').map(Number);
      if (timeParts.length !== 2) {
        onTime++;
        continue;
      }

      const [hours, minutes] = timeParts;
      let etaHour = hours;
      if (meridiem === 'PM' && hours !== 12) etaHour += 12;
      if (meridiem === 'AM' && hours === 12) etaHour = 0;

      const deliveredDate = new Date(d.deliveredAt);
      const etaEndDate = new Date(deliveredDate);
      etaEndDate.setHours(etaHour, minutes, 0, 0);

      if (deliveredDate <= etaEndDate) {
        onTime++;
      } else {
        late++;
      }
    }
    const rejected = await this.prisma.client.deliveryRejection.count({
      where: { riderId: rider.id },
    });

    const averageDeliveryTimeMinutes = 25;

    const finished = delivered.length + cancelled;
    const successRate =
      finished > 0 ? Math.round((delivered.length / finished) * 100) : 0;

    return {
      completedDeliveries: delivered.length,
      failedDeliveries: cancelled,
      averageDeliveryTimeMinutes,
      successRate,
      onTimeDeliveries: onTime,
      lateDeliveries: late,
      cancelledDeliveries: cancelled,
      rejectedDeliveries: rejected,
    };
  }

  async getWeeklyDeliveries(userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const deliveries = await this.prisma.client.delivery.findMany({
      where: {
        riderId: rider.id,
        status: 'DELIVERED',
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const counts = days.map((day) => ({ day, count: 0 }));

    deliveries.forEach((delivery) => {
      const date = new Date(delivery.createdAt);
      const dayIndex = (date.getDay() + 6) % 7;
      if (counts[dayIndex]) {
        counts[dayIndex].count += 1;
      }
    });

    return counts;
  }

  async getDocuments(userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return this.prisma.client.riderDocument.findMany({
      where: { riderId: rider.id },
    });
  }

  async uploadDocument(
    userId: string,
    payload: { file: any; documentType: string },
  ) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    const { file, documentType } = payload;

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!documentType) {
      throw new BadRequestException('Document type is required');
    }

    // Store as base64 data URL (in production, use S3/Cloudinary)
    const fileUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    // Check if a document of this type already exists
    const existingDoc = await this.prisma.client.riderDocument.findFirst({
      where: {
        riderId: rider.id,
        documentType,
      },
    });

    if (existingDoc) {
      return this.prisma.client.riderDocument.update({
        where: { id: existingDoc.id },
        data: {
          fileUrl,
          status: 'pending',
          uploadedAt: new Date(),
        },
      });
    }

    return this.prisma.client.riderDocument.create({
      data: {
        riderId: rider.id,
        documentType,
        fileUrl,
        status: 'pending',
      },
    });
  }

  // ==============================
  // BANK INFO
  // ==============================

  async getBankInfo(userId: string) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return {
      bankName: rider.bankName || '',
      accountNumber: rider.bankAccountNumber || '',
      accountName: rider.bankAccountName || '',
      isVerified: false,
    };
  }

  async updateBankInfo(userId: string, dto: any) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return this.prisma.client.rider.update({
      where: { userId },
      data: {
        bankName: dto.bankName,
        bankAccountNumber: dto.accountNumber,
        bankAccountName: dto.accountName,
      },
    });
  }

  // ==============================
  // VEHICLE
  // ==============================

  async updateVehicle(userId: string, dto: any) {
    const rider = await this.prisma.client.rider.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return this.prisma.client.rider.update({
      where: { userId },
      data: {
        vehicleType: dto.vehicleType,
        plateNumber: dto.plateNumber,
        vehicleCapacityKg: dto.capacityKg,
      },
    });
  }
}