import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>(
      'isPublic',
      context.getHandler(),
    );
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();

    const token = request.cookies?.jwt; // Extract token from cookies

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const decoded = await this.jwtService.verify(token);
      request.user = decoded; // Attach user info to request
      return true;
    } catch (error) {
      Logger.error(error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
