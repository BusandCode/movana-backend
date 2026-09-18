import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DeliveriesService } from './deliveries.service.js';
import { GetUser } from '../common/decorators/get-user.decorator.js';

@Controller('deliveries')
@UseGuards(AuthGuard('jwt'))
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get('offers')
  async getAvailableOffers(@GetUser() user: any) {
    const data = await this.deliveriesService.getAvailableOffers(user.id);
    return { success: true, data };
  }

  @Get('active')
  async getActiveDeliveries(@GetUser() user: any) {
    const data = await this.deliveriesService.getActiveDeliveries(user.id);
    return { success: true, data };
  }

  @Get('history')
  async getDeliveryHistory(@GetUser() user: any) {
    const data = await this.deliveriesService.getDeliveryHistory(user.id);
    return { success: true, data };
  }

  @Get(':id')
  async getDelivery(@Param('id') id: string) {
    const data = await this.deliveriesService.getDelivery(id);
    return { success: true, data };
  }

  @Post(':id/accept')
  async acceptDelivery(@Param('id') id: string, @GetUser() user: any) {
    const data = await this.deliveriesService.acceptDelivery(id, user.id);
    return { success: true, data };
  }

  @Post(':id/reject')
  async rejectDelivery(@Param('id') id: string, @GetUser() user: any) {
    const data = await this.deliveriesService.rejectDelivery(id, user.id);
    return { success: true, data };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const data = await this.deliveriesService.updateStatus(id, status);
    return { success: true, data };
  }

  @Post(':id/proof-of-delivery')
  async submitProofOfDelivery(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() proof: any,
  ) {
    const data = await this.deliveriesService.submitProofOfDelivery(id, user.id, proof);
    return { success: true, data };
  }
}