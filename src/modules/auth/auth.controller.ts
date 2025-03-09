import {
  Body,
  Req,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
  Get,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import RequestWithUser from './requestWithUser.interface';
import { LocalAuthenticationGuard } from './localAuth.guard';
import JwtAuthenticationGuard from './jwt-authentication.guard';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthService) {}

  @Post('register')
  async register(@Body() registrationData: CreateUserDto) {
    return this.authenticationService.register(registrationData);
  }
  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  logIn(@Req() request: RequestWithUser, @Res() response: Response) {
    const { user } = request;
    const token = this.authenticationService.getCookieWithJwtToken(user.id);

    response.cookie('Authentication', token, {
      httpOnly: true, 
      sameSite: 'strict', 
      maxAge: 3600 * 1000,
    });

    return response.send({ message: 'Login successful', user });
  }

  @Post('log-out')
  logOut(@Req() request: Request, @Res() response: Response) {
    response.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookieForLogOut(),
    );
    response.cookie('Authentication', '', { maxAge: 0 });
    return response.sendStatus(200);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  authenticate(@Req() request: RequestWithUser) {
    const { password, ...userWithoutPassword } = request.user; // ✅ Do not modify request.user directly
    return userWithoutPassword;
  }
}
