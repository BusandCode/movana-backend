import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:5000';
  private readonly apiKey = process.env.AI_API_KEY || 'movana-ai-secret-key';

  constructor(private readonly http: HttpService) {}

  async rankOffers(rider: any, offers: any[]) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.aiUrl}/ai/offers/rank`,
          {
            rider: {
              rider_id: rider.id,
              rider_latitude: rider.currentLatitude || 6.4406,
              rider_longitude: rider.currentLongitude || 3.4784,
              success_rate: rider.successRate || 50,
              total_deliveries: rider.totalDeliveries || 0,
            },
            offers: offers.map((o) => ({
              offer_id: o.id,
              pickup_latitude: o.pickup?.coordinates?.latitude || 0,
              pickup_longitude: o.pickup?.coordinates?.longitude || 0,
              dropoff_latitude: o.dropoff?.coordinates?.latitude || 0,
              dropoff_longitude: o.dropoff?.coordinates?.longitude || 0,
              distance_km: o.distanceKm || 0,
              rider_earnings: o.riderEarnings || 0,
              priority: o.priority || 'NORMAL',
            })),
          },
          { headers: { 'x-api-key': this.apiKey } }
        )
      );
      return data.ranked;
    } catch (error: any) {
      this.logger.error(`AI rank failed: ${error.message}`);
      // Fallback: return offers with default scores
      return offers.map((o) => ({
        offer_id: o.id,
        score: 50,
        reason: 'Standard offer',
        estimated_eta_minutes: 25,
      }));
    }
  }

  async predictEta(distanceKm: number) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.aiUrl}/ai/eta/predict`,
          { distance_km: distanceKm },
          { headers: { 'x-api-key': this.apiKey } }
        )
      );
      return data;
    } catch (error: any) {
      this.logger.error(`AI ETA failed: ${error.message}`);
      return {
        eta_minutes: Math.round(distanceKm * 3 + 20),
        eta_start: '15 min',
        eta_end: '35 min',
        confidence: 0.5,
      };
    }
  }

  async generateInsights(performance: any) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.aiUrl}/ai/insights/generate`,
          {
            rider_id: performance.riderId,
            on_time_deliveries: performance.onTimeDeliveries || 0,
            late_deliveries: performance.lateDeliveries || 0,
            cancelled_deliveries: performance.cancelledDeliveries || 0,
            rejected_deliveries: performance.rejectedDeliveries || 0,
            average_delivery_time_minutes: performance.averageDeliveryTimeMinutes || 0,
            total_deliveries: performance.completedDeliveries || 0,
          },
          { headers: { 'x-api-key': this.apiKey } }
        )
      );
      return data;
    } catch (error: any) {
      this.logger.error(`AI insights failed: ${error.message}`);
      return { overall_score: 0, insights: [] };
    }
  }
}