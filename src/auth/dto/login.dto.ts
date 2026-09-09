import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  phoneOrEmail!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
