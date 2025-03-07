import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(email: string, name: string, password: string) {
    return this.prisma.user.create({
      data: { email, name, password },
    });
  }

  async getUsers() {
    return this.prisma.user.findMany();
  }
}
