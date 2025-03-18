import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    const user = await this.prisma.users.findFirstOrThrow({ where: { id } });
    if (!user.isVerified) {
      throw new HttpException(
        'Please verify your email address',
        HttpStatus.NOT_FOUND,
      );
    }
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
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
