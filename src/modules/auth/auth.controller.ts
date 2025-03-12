import {
  Body,
  Req,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import RequestWithUser from './requestWithUser.interface';
import { LocalAuthenticationGuard } from './localAuth.guard';
import JwtAuthenticationGuard from './jwt-authentication.guard';
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

  //when a user logs in, the email and password are validated using LocalAuthenticationGuard
  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('log-in')
  logIn(
    @Body() LoginDto: LoginDto,
    @Req() request: RequestWithUser,
    @Res() response: Response,
  ) {
    //user is available because of the interface
    const { user } = request; //if login is successful, holds the authenticated user
    //jwt token is generated and sent in cookie
    const cookie = this.authenticationService.getCookieWithJwtToken(user.id);

    response.setHeader('Set-Cookie', cookie);

    return response.send({ message: 'Login successful', user });
  }

  //user, when sends POST request, this ensures only authenticated users can log out
  @UseGuards(JwtAuthenticationGuard)
  @Post('log-out')
  logOut(@Req() request: RequestWithUser, @Res() response: Response) {
    response.setHeader(
      'Set-Cookie',
      //calls the 'getCookieForLogOut' method in AuthService to get a cookie that will remove authentication
      this.authenticationService.getCookieForLogOut(),
    );
    return response.sendStatus(200);
  }
}
