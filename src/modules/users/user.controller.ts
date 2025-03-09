import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import JwtAuthenticationGuard from '../auth/jwt-authentication.guard';
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('create')
  async createUser(
    @Body()
    body: CreateUserDto,
  ) {
    return this.userService.createUser(body);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get()
  async getUsers() {
    return this.userService.getUsers();
  }
}
