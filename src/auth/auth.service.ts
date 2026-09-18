import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

const isDev = process.env.NODE_ENV !== 'production';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      // Check if user exists with email or phone
      const existingUser = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: dto.email }, { phone: dto.phone }],
        },
      });

      if (existingUser) {
        const field = existingUser.email === dto.email ? 'email' : 'phone number';
        // Expected outcome, not an error — no stack trace needed
        throw new ConflictException(`A user with this ${field} already exists. Please login instead.`);
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

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

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      this.logger.log(`User registered: ${user.id}`);

      return {
        message: 'Registration successful! Welcome to Movana.',
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
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        if (isDev) this.logger.debug(`Registration rejected: ${error.message}`);
        throw error;
      }

      if (error.code === 'P2002') {
        if (isDev) this.logger.debug(`Registration conflict (P2002): ${dto.email}`);
        throw new ConflictException('A user with this email or phone number already exists.');
      }

      // Genuinely unexpected — worth the full stack
      this.logger.error(`Registration failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Registration failed. Please try again later.');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.client.user.findFirst({
        where: {
          OR: [{ email: dto.phoneOrEmail }, { phone: dto.phoneOrEmail }],
        },
        include: {
          rider: true,
        },
      });

      if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
        if (isDev) this.logger.debug(`Login rejected: ${dto.phoneOrEmail}`);
        throw new UnauthorizedException('Invalid email/phone or password. Please try again.');
      }

      const token = this.jwtService.sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      this.logger.log(`Login: ${user.id}`);

      return {
        message: 'Login successful! Welcome back.',
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Genuinely unexpected — worth the full stack
      this.logger.error(`Login failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Login failed. Please try again later.');
    }
  }
}