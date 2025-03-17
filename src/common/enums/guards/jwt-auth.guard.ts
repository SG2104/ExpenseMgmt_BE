import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { users } from '@prisma/client';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';

// Extend Request interface to include "user"
export interface AuthenticatedRequest extends Request {
  user?: users;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>(); //switches to http mode and retrieves the incoming HTTP request
    //request holds the full HTTP request object
    const token = request.cookies?.jwt; //accesses all cookies sent; if it exists, token is assigned the JWT token. if it doesn't exists, token remains undefined
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    //if public, request is allowed immediately.
    //but the verify-otp route is not public, so the check fails
    if (isPublic) {
      return true;
    }
    //no jwt token
    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const jwtUserData: users = await this.jwtService.verify(token); //decode jwt and extract user data
      //extracted user data will have id, email, isVerified
      request.user = jwtUserData; // assign the value of jwtUserData to the user property of request
      // checks if the request is for /verify-otp
      const isOtpVerificationRoute = request.url.includes('verify-otp');
      if (isOtpVerificationRoute && !jwtUserData.isVerified) {
        //if the user is unverified and trying to verify otp, allow them
        return true;
      }

      // Otherwise, allow access only if user is verified, blocked for other routes
      if (!jwtUserData.isVerified) {
        throw new UnauthorizedException('Email not verified');
      }

      return true; //if all checks pass, the request is allowed
    } catch (error) {
      //if jwt is invalid (jwtUserData)
      Logger.error(error);
      throw new UnauthorizedException(error.message);
    }
  }
}
//even if the function returns true or false, the request.user was modified in the guard, the controller now will have access to req.user
