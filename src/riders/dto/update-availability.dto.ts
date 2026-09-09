import { IsBoolean } from 'class-validator';

export class UpdateAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
