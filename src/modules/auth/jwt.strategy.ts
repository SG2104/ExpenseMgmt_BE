import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UserService } from '../users/user.service';
import { TokenPayload } from './tokenPayload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      //extracts the JWT token from the request
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          //it looks in this specifically, means the JWT token must be stored in a cookie
          return (request?.cookies?.Authentication as string) || '';
        },
      ]),
      //the system retrieves the JWT_SECRET from the .env file
      //secret key is used to decrypt and verify the JWT
      secretOrKey: configService.get('JWT_SECRET', 'defaultsecret') || '',
    });
  }

  //once jwt is validated, this method is called, the userid is extracted
  //it calls this to fetch the user
  async validate(payload: TokenPayload) {
    return this.userService.getById(payload.userId);
  }
}
