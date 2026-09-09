import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      this.logger.log(`Registering user: ${dto.email}`);
      
      const existingUser = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: dto.email }, { phone: dto.phone }],
        },
      });

      if (existingUser) {
        this.logger.warn(`User already exists: ${dto.email}`);
        throw new ConflictException('User already exists');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);
      this.logger.log('Password hashed successfully');

      const user = await this.prisma.client.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          passwordHash: hashedPassword,
          role: 'RIDER',
          rider: {
            create: {
              name: dto.name,
              vehicleType: dto.vehicleType as any || 'MOTORCYCLE',
              plateNumber: dto.plateNumber || '',
            },
          },
        },
        include: {
          rider: true,
        },
      });

      this.logger.log(`User created successfully: ${user.id}`);

      const token = this.jwtService.sign({ 
        sub: user.id, 
        email: user.email, 
        role: user.role 
      });

      return {
        message: 'Registration successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          rider: user.rider,
        },
      };
    } catch (error: any) {
      this.logger.error(`Registration error: ${error.message}`);
      this.logger.error(error.stack);
      
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Registration failed: ${error.message}`);
    }
  }

  async login(dto: LoginDto) {
    try {
      this.logger.log(`Login attempt: ${dto.phoneOrEmail}`);
      
      const user = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: dto.phoneOrEmail }, { phone: dto.phoneOrEmail }],
        },
        include: {
          rider: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found: ${dto.phoneOrEmail}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for user: ${dto.phoneOrEmail}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const token = this.jwtService.sign({ 
        sub: user.id, 
        email: user.email, 
        role: user.role 
      });

      this.logger.log(`Login successful: ${user.id}`);

      return {
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          rider: user.rider,
        },
      };
    } catch (error: any) {
      this.logger.error(`Login error: ${error.message}`);
      this.logger.error(error.stack);
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Login failed: ${error.message}`);
    }
  }
}
