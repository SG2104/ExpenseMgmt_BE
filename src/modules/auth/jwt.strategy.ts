import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from '../users/user.service';
import { TokenPayload } from './tokenPayload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          console.log('🟡 Extracting JWT from cookies:', request.cookies);

          if (request?.cookies?.Authentication) {
            return request.cookies.Authentication;
          }
          return null;
        },
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: TokenPayload) {
    const user = await this.userService.getById(payload.userId);

    if (!user) {
      throw new UnauthorizedException('User not found or token invalid');
    }
    return user;
  }
}
