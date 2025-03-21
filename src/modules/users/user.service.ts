import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.users.findMany({ omit: { password: true } });
  }
  async getByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
      select: { id: true, email: true, isVerified: true, password: true },
    });
  }

  async getById(id: string) {
    try {
      const user = await this.prisma.users.findFirstOrThrow({ where: { id } });

      if (!user.isVerified) {
        throw new HttpException(
          'Please verify your email address',
          HttpStatus.FORBIDDEN, // Use 403 for unauthorized access
        );
      }

      return user; // No need to check `if (user)` again
    } catch (error) {
      Logger.error(error);
      throw new HttpException(
        'User with this ID does not exist',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async verifyEmail(email: string) {
    return await this.prisma.users.update({
      where: { email },
      data: { isVerified: true },
      omit: {
        password: true,
      },
    });
  }
  async updatePassword(email: string, hashedPassword: string) {
    return this.prisma.users.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }
}
