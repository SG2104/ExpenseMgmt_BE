import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { users } from '@prisma/client';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authenticationService: AuthService) {
    super({
      //specifies the 'email' should be used as the username
      usernameField: 'email',
    });
  }

  //the validate method is called automatically by Passport when a user attempts to log in
  async validate(email: string, password: string): Promise<Partial<users>> {
    // Calls the 'getAuthenticatedUser' method in AuthService to check the credentials
    return await this.authenticationService.getAuthenticatedUser(
      email,
      password,
    );
  }
}
