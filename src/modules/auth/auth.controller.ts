import { Body, Controller, Post, Response } from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { Response as ExpressResponse } from 'express';
import LoginDto from './dto/login.dto';

@Controller('authentication') //base route
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthService) {}

  @Post('register')
  //@Body extracts user input from the request
  async register(@Body() registrationData: CreateUserDto) {
    //injects AuthService to use the function
    return this.authenticationService.register(registrationData);
  }
  @Public()
  @Post('login')
  async login(@Body() login: LoginDto, @Response() res: ExpressResponse) {
    const { email, password } = login;
    const token = await this.authenticationService.login(email, password);
    const access_token = token?.access_token;
    if (access_token) {
      // Set JWT token as HTTP-only cookie
      res.cookie('jwt', access_token, {
        httpOnly: true, // Prevents JavaScript access (protection against XSS)
        secure: process.env.NODE_ENV === 'production', // Secure only in production (HTTPS)
        sameSite: 'strict', // CSRF protection
        maxAge: 60 * 60 * 1000, // 1 hour expiration
      });

      return res.json({ message: 'Login successful' });
    }
  }

  @Post('logout')
  logout(@Response() res: ExpressResponse) {
    res.clearCookie('jwt');
    return res.json({ message: 'Logout successful' });
  }
}
