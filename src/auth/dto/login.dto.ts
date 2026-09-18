import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  phoneOrEmail!: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}