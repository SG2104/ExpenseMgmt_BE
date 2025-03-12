import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
//this tells passport.js to use the local strategy.
//triggers email and password validation using local.strategy.ts
export class LocalAuthenticationGuard extends AuthGuard('local') {}
