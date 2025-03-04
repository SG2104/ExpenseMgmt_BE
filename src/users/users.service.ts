import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../models/user.model';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User) private readonly userModel: typeof User) {}

  async createUser(
    name: string,
    email: string,
    password: string,
  ): Promise<User> {
    return this.userModel.create({ name, email, password } as User);
  }

  async getUsers(): Promise<User[]> {
    return this.userModel.findAll();
  }
}
