import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RidersService } from './riders.service.js';
import { GetUser } from '../common/decorators/get-user.decorator.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';

@Controller('riders')
@UseGuards(AuthGuard('jwt'))
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @Get('me')
  async getProfile(@GetUser() user: any) {
    const data = await this.ridersService.getProfile(user.id);
    return { success: true, data };
  }

  @Patch('me/availability')
  async updateAvailability(
    @GetUser() user: any,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    const data = await this.ridersService.updateAvailability(user.id, dto);
    return { success: true, data };
  }

  @Get('me/earnings')
  async getEarnings(@GetUser() user: any) {
    const data = await this.ridersService.getEarnings(user.id);
    return { success: true, data };
  }

  @Get('me/performance')
  async getPerformance(@GetUser() user: any) {
    const data = await this.ridersService.getPerformance(user.id);
    return { success: true, data };
  }

  @Get('me/deliveries/weekly')
  async getWeeklyDeliveries(@GetUser() user: any) {
    const data = await this.ridersService.getWeeklyDeliveries(user.id);
    return { success: true, data };
  }

  @Get('me/documents')
  async getDocuments(@GetUser() user: any) {
    const data = await this.ridersService.getDocuments(user.id);
    return { success: true, data };
  }

  @Post('me/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @GetUser() user: any,
    @UploadedFile() file: any,
    @Body('documentType') documentType: string,
  ) {
    const data = await this.ridersService.uploadDocument(user.id, {
      file,
      documentType,
    });
    return { success: true, data };
  }

  @Get('me/bank-info')
  async getBankInfo(@GetUser() user: any) {
    const data = await this.ridersService.getBankInfo(user.id);
    return { success: true, data };
  }

  @Patch('me/bank-info')
  async updateBankInfo(@GetUser() user: any, @Body() dto: any) {
    const data = await this.ridersService.updateBankInfo(user.id, dto);
    return { success: true, data };
  }

  @Patch('me/vehicle')
  async updateVehicle(@GetUser() user: any, @Body() dto: any) {
    const data = await this.ridersService.updateVehicle(user.id, dto);
    return { success: true, data };
  }
}