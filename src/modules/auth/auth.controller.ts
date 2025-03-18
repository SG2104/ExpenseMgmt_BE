import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Request,
  Response,
} from '@nestjs/common';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { Response as ExpressResponse } from 'express';
import LoginDto from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { AuthenticatedRequest } from 'src/common/enums/guards/jwt-auth.guard';
import { RequestOtpDto } from './dto/request-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UserService } from '../users/user.service';
import { MailService } from '../mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Redis } from 'ioredis';
@Controller('authentication') //base route
export class AuthenticationController {
  private redis = new Redis(); // Connect to Redis

  constructor(
    private readonly authenticationService: AuthService,
    private readonly UserService: UserService,
    private readonly MailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  @Public() //means it does not require authentication.
  @Post('register') //handles post request to this route
  //@Body extracts the request body and registrationData stores the user input
  //createUserDto ensures the incoming data matches a specific format
  async register(@Body() registrationData: CreateUserDto) {
    //calls the register function in authService, passes the user input:registrationData to the authService
    return this.authenticationService.register(registrationData);
  }

  @Public() //makes the route public, meaning it does not require authentication
  @Post('login')
  //extracts the request body(email and password) and ensures the incoming data matches a specific format
  //Injects the Express response object to send custom responses (like cookies)
  async login(@Body() login: LoginDto, @Response() res: ExpressResponse) {
    const { email, password } = login; //extracts email and password from login
    //calls the login function passing email and password
    //result stores the response from the service
    const result = await this.authenticationService.login(email, password);

    const access_token = result?.access_token;
    // Set JWT token as HTTP-only cookie if already verified
    if (access_token) {
      // Set JWT token as HTTP-only cookie
      res.cookie('jwt', access_token, {
        httpOnly: true, // Prevents JavaScript access (protection against XSS)
        secure: process.env.NODE_ENV === 'production', // Secure only in production (HTTPS)
        sameSite: 'strict', // CSRF protection
        maxAge: 60 * 60 * 1000, // 1 hour expiration
      });
      if (result?.requiresOtp) {
        return res.json({ requiresOtp: true, message: 'OTP required' });
      }
      return res.json({ message: 'Login successful' });
    }
    throw new HttpException('something went wrong', 400);
  }

  @Post('logout')
  logout(@Response() res: ExpressResponse) {
    res.clearCookie('jwt');
    return res.json({ message: 'Logout successful' });
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto, //extracts the request body (otp) and is validated through Dto
    @Response() res: ExpressResponse,
    @Request() req: AuthenticatedRequest, //we get the user info from the request (jwt-auth.guard.ts)
  ) {
    const { otp } = verifyOtpDto;
    //extract the user property from req and store it in a variable called 'user'
    const { user } = req; //req object contains all request data. it includes req.user, set by jwtAuthGuard.ts, this line extracts req.user and stores it in a separate user variable
    //user object contains, id, email, isVerified
    if (!user) {
      //user will be undefined: no jwt token in cookies, invalid jwt, jwt does not contain user info
      return res.status(401).json({ message: 'Unauthorized' });
    }
    //passes user email and otp on verifyOtp function
    const token = await this.authenticationService.verifyOtp(user.email, otp);
    // stores the new jwt in cookies (if otp is verified in the function)
    res.cookie('jwt', token, {
      httpOnly: true, //prevents javascript from accessing cookies
      secure: process.env.NODE_ENV === 'production', //ensures cookies are sent over HTTPS
      sameSite: 'strict', //prevents csrf attacks
      maxAge: 60 * 60 * 1000, //token expires in 1 hr
    });

    return res.json({ message: 'OTP verified successfully' });
  }

  @Post('request-otp')
  async requestOtp(
    @Body() requestOtpDto: RequestOtpDto,
    @Response() res: ExpressResponse,
    @Request() req: AuthenticatedRequest,
  ) {
    const { email } = requestOtpDto;
    const { user } = req;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await this.authenticationService.sendOTP(
      `${user.first_name} ${user.last_name}`,
      email,
    );

    return { message: 'OTP sent successfully' };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() { email }: ForgotPasswordDto) {
    //checks if the user exists in the database
    const user = await this.UserService.getByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    //generates a jwt reset token with a 15-minute expiration
    const resetToken = this.jwtService.sign(
      { email: user.email }, //contains the email so that it remembers which user requested the password reset
      //the token is protected by a secret password stored in .env
      { secret: process.env.RESET_PASSWORD_SECRET, expiresIn: '15m' },
    );

    //stores the reset token in redis (expires after 15 min)
    await this.redis.set(`${email}-reset-token`, resetToken);

    //create a reset link that the user will receive in their email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`Generated Reset Link: ${resetLink}`);

    //send an email to the user with the reset link
    await this.MailService.sendMail({
      email,
      subject: 'Password Reset Request',
      templateName: 'password-reset',
      data: { resetLink },
    });
    return { message: 'Password rest link sent to your email' };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    //the user sends a post request with token (received via mail) and new password
    const { token, newPassword } = resetPasswordDto;

    console.log(`Received Token: ${token}`);
    console.log(`New Password: ${newPassword}`);
    try {
      // decode the token to find who requested the reset. (decoded token will have email, iat, exp (jwt.io))
      const payload: any = this.jwtService.verify(token, {
        secret: process.env.RESET_PASSWORD_SECRET, // ✅ Ensures token is valid
      });
      if (!payload || !payload.email) {
        throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
      }

      //extracts the email from the decoded token
      const email = payload.email;

      //check redis to see if the token was actually issued.
      const storedToken = await this.redis.get(`${email}-reset-token`);
      console.log(`Token from Redis: ${storedToken}`);

      // Compare received token with Redis stored token
      if (!storedToken || storedToken !== token) {
        throw new HttpException(
          'Invalid or expired token',
          HttpStatus.BAD_REQUEST,
        );
      }

      // now it becomes sure that the user exists in database before changing their password
      const user = await this.UserService.getByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log(`Hashed Password: ${hashedPassword}`);

      // Update password in DB
      await this.UserService.updatePassword(user.email, hashedPassword);
      console.log(`Password updated successfully for ${user.email}`);

      // Delete the token from Redis (so it can’t be reused)
      await this.redis.del(`${email}-reset-token`);
      console.log(`Token removed from Redis after successful reset`);

      return { message: 'Password reset successful' };
    } catch (error) {
      console.error(`Error resetting password:`, error);
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
  }
}
