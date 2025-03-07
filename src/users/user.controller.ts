import { Controller, Get, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  createUser(@Body() body: { email: string; name: string; password: string }) {
    return this.userService.createUser(body.email, body.name, body.password);
  }

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }
}
