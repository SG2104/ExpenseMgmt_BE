import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
//tells nest to use the jwt strategy
export default class JwtAuthenticationGuard extends AuthGuard('jwt') {}
