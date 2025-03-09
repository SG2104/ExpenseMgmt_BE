import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import JwtAuthenticationGuard from '../auth/jwt-authentication.guard';
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
  @UseGuards(JwtAuthenticationGuard)
  getUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  @UseGuards(JwtAuthenticationGuard)
  async getUserById(@Param('id') id: string) {
    return this.userService.getById(id);
  }
}
