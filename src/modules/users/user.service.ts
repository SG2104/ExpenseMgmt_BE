import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    return this.prisma.users.create({
      data,

      omit: { password: true },
    });
  }
  async getUsers() {
    return this.prisma.users.findMany({ omit: { password: true } });
  }
  async getByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email } });
  }

  async getById(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }
}
