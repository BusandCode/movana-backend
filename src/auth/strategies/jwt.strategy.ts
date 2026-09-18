import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error(
        'Missing JWT_ACCESS_SECRET env var — set it in .env before starting the app.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: any) {
    let user;

    try {
      user = await this.prisma.client.user.findUnique({
        where: { id: payload.sub },
        include: {
          rider: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P1001') {
        throw new ServiceUnavailableException(
          'Database temporarily unreachable',
        );
      }

      throw err;
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      rider: user.rider,
    };
  }
}