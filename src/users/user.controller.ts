import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(
    @Body()
    body: CreateUserDto,
  ) {
    return this.userService.createUser(body);
  }

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }
}
