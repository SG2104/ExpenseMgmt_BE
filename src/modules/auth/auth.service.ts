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
@Injectable()
export class AuthService {
  private redis = new Redis(); // Connect to Redis
  constructor(
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private prisma: PrismaService,
    private readonly usersService: UserService,
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

  // verifyToken(token: string): Promise<any> {
  //   try {
  //     return this.jwtService.verify(token);
  //   } catch (error) {
  //     Logger.error(error);
  //     throw new UnauthorizedException('Invalid token');
  //   }
  // }

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
}
