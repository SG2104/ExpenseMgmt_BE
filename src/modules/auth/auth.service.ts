import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PostgresErrorCode } from 'src/common/enums';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { users } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import Redis from 'ioredis';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class AuthService {
  private redis = new Redis(); // Connect to Redis
  constructor(
    private readonly mailService: MailService,
    private prisma: PrismaService,
    private readonly usersService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  //registrationData contains user input and is validated by createUserDto
  public async register(registrationData: CreateUserDto) {
    //hash the password. registrationData.password is the raw password input by the user.
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    const payload = {
      //payload is an object that contains the user data. it is used to send data to the database.
      ...registrationData, //copies all the properties from registrationData
      password: hashedPassword, //password field is replaced with hash password
    };
    try {
      //prisma ORM used to insert the user into the users table in the database
      const createdUser = await this.prisma.users.create({
        data: payload,
        //specifies which fields should be returned from the database
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
        },
      });
      if (!createdUser) {
        //if the user is not created, it means email already exists
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      return createdUser;
    } catch (error: any) {
      Logger.error(error);
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async validateUser(email: string, password: string): Promise<any> {
    //calls getByEmail function to fetch the user
    const user = await this.usersService.getByEmail(email);
    //compares the hashed password from the database with the entered password
    //user.password is the hashed password stored in the database
    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      //returns user without password if authentication is successful
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(email: string, password: string) {
    //checks if the user exists and password is correct
    const user: users = await this.validateUser(email, password);
    //the user object is encoded inside the JWT. the token is returned and sent to the user.
    //jwt before signing will have (id, email, isVerified)
    const access_token = this.jwtService.sign(user); //creates a JWT token if the credentials are correct
    // If user is not verified, don't generate JWT yet
    if (!user.isVerified) {
      //if user is not verified, it sends an OTP
      //calls sendOTP function and passes the full name of the user, sends the otp to the user's registered email
      await this.sendOTP(`${user.first_name} ${user.last_name}`, user.email); // Send OTP(email);
      return {
        requiresOtp: true,
        access_token, //provides the JWT but it must first verify the otp before allowing access
      };
    }
    return {
      //if verified, returns the JWT token
      access_token,
    };
  }

  async sendOTP(name: string, email: string) {
    // Generate a random number between 0 and 999999
    const randomNumber = Math.floor(Math.random() * 1000000);

    // Pad the number with leading zeros if necessary
    const otp = randomNumber.toString().padStart(6, '0');

    //the otp is stored in redis with the key "email-otp", so that each user gets a unique otp
    await this.redis.set(`${email}-otp`, otp);

    //calls sendMail(), which sends an email to the user
    await this.mailService.sendMail({
      email,
      templateName: 'send-otp', //uses the email-template (send-otp.ejs)
      data: {
        otp,
        name, // Pass user's name
      },
      subject: 'OTP Verification',
    });

    return otp;
  }

  async verifyOtp(email: string, otp: string): Promise<string> {
    //this generates the key to fetch the otp
    const redisOtpKey = `${email}-otp`; //the otp is stored in redis using a key format like this

    //checks the redis for the opt using the generated key
    const storedOtp = await this.redis.get(redisOtpKey); // Get OTP from Redis

    if (!(storedOtp === otp)) {
      throw new HttpException('Invalid OTP', HttpStatus.BAD_REQUEST);
    }
    await this.redis.del(redisOtpKey); // Remove OTP

    // Mark user as verified
    const verifiedUser = await this.usersService.verifyEmail(email);

    // Generate JWT for now verified user
    const access_token = this.jwtService.sign(verifiedUser);

    // Set JWT cookie
    return access_token;
  }
  async forgotPassword(email: string) {
    //checks if the user exists in the database
    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    //generates a jwt reset token with a 15-minute expiration
    const resetToken = this.jwtService.sign(
      { email: user.email }, //contains the email so that it remembers which user requested the password reset
      //the token is protected by a secret password stored in .env
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    //stores the reset token in redis (expires after 15 min)
    await this.redis.set(`${email}-reset-token`, resetToken);

    //create a reset link that the user will receive in their email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    console.log(`Generated Reset Link: ${resetLink}`);

    //send an email to the user with the reset link
    await this.mailService.sendMail({
      email,
      subject: 'Password Reset Request',
      templateName: 'password-reset',
      data: { resetLink },
    });
  }
  async resetPassword({ newPassword, token }: ResetPasswordDto) {
    try {
      // decode the token to find who requested the reset. (decoded token will have email, iat, exp (jwt.io))
      const payload: any = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'), // ✅ Ensures token is valid
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
      const user = await this.usersService.getByEmail(email);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      console.log(`Hashed Password: ${hashedPassword}`);

      // Update password in DB
      await this.usersService.updatePassword(user.email, hashedPassword);
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

  async changePassword(email: string, payload: ChangePasswordDto) {
    const { currentPassword, newPassword } = payload;
    // Extract the logged-in user's email from the JWT token

    // Fetch user from the database
    const user = await this.usersService.getByEmail(email);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    // Check if the current password matches the one in the database
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new HttpException(
        'Incorrect current password',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Hash the new password before saving it
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await this.usersService.updatePassword(email, hashedNewPassword);
  }
}
